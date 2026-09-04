import { useEffect, useRef, useState } from "react";
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { subscribeToPrice, fetchHistory, isLiveFeed } from "@/services/priceService";
import { useStore } from "@/state/store";
import { getSpec, symbolStatus } from "@/lib/symbols";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ScalperLiteCalculator, type Candle, type Signal } from "@/lib/indicators/scalperLite";

interface Props {
  symbol: string;
}

/** Bars of history to load. Paginated from the feed, so this can exceed one page. */
const HISTORY_CANDLES = 4000;
/**
 * Bars actually in view once the chart opens. Fitting all HISTORY_CANDLES into
 * the pane would draw each candle a fraction of a pixel wide — a smear rather
 * than a chart. The rest stays loaded and is a scroll or a pinch away.
 *
 * A phone gets far fewer: 110 candles across a 320px pane is under 3px each,
 * which is the same smear one breakpoint down. The rest is still a pinch away.
 */
const VISIBLE_CANDLES_DESKTOP = 110;
const VISIBLE_CANDLES_MOBILE = 45;
const MOBILE_BREAKPOINT = 640;
const NARROW_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function visibleCandles(width: number) {
  return width < MOBILE_BREAKPOINT ? VISIBLE_CANDLES_MOBILE : VISIBLE_CANDLES_DESKTOP;
}
/** Empty bars kept to the right of the last candle, as MT5 and TradingView do. */
const RIGHT_MARGIN_BARS = 8;

const BUY_COLOR = "#2962FF";
const SELL_COLOR = "#F23645";
const TP_COLOR = "#26A69A";
const SL_COLOR = "#EF5350";

const toTime = (seconds: number) => seconds as UTCTimestamp;

/** Snap a wall-clock timestamp onto the candle grid so markers sit on a bar. */
function bucketAt(ms: number, intervalSec: number): number {
  return Math.floor(ms / 1000 / intervalSec) * intervalSec;
}

/** Human label for the chart's timeframe badge. */
function timeframeLabel(intervalSec: number): string {
  return intervalSec >= 3600 ? `${intervalSec / 3600}H` : `${intervalSec / 60}M`;
}

export function TradingChart({ symbol }: Props) {
  const { user, trades, now, priceOf } = useStore();
  const spec = getSpec(symbol);
  const session = symbolStatus(spec.id, new Date(now));
  const interval = spec.chartInterval;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const lastCandleRef = useRef<Candle | null>(null);
  const rangeRef = useRef<{ first: number; last: number }>({ first: 0, last: 0 });

  // Closed candles kept for the indicator, which needs 2*halfLength+1 bars.
  const candlesRef = useRef<Candle[]>([]);
  const scalperRef = useRef<ScalperLiteCalculator | null>(null);

  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  // Rough price level for this instrument, used to scale the indicator's arrow
  // offset so one config works from FX to Bitcoin. Deliberately quantised: on a
  // live feed this is the ticking price, and it gates the history-load effect
  // below, which would otherwise refetch the whole chart on every tick.
  const livePrice = spec.feed.kind === "simulated" ? spec.feed.basePrice : priceOf(spec.id) || 1000;
  const anchorPrice = Math.round(livePrice / 100) * 100 || 1000;

  const restricted = user.name === "HITESH";
  const isNarrow = useMediaQuery(NARROW_QUERY);

  // --- Chart construction (once per mount) ---
  useEffect(() => {
    if (restricted || !containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b8b96",
        fontFamily: "ui-monospace, monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        // The default 10%/10% margins waste vertical space that a phone pane
        // does not have to spare.
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      // Vertical touch-drag on the price scale fights the page scroll on a
      // phone; horizontal pan and pinch zoom are the gestures that matter.
      handleScroll: { vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: { time: true, price: false } },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        rightOffset: RIGHT_MARGIN_BARS,
        // A finger drag on the time axis should pan the chart, not select it.
        fixLeftEdge: false,
        // Well below the default so the whole 4000-bar history is still
        // reachable by zooming out.
        minBarSpacing: 0.05,
      },
      autoSize: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#26A69A",
      downColor: "#EF5350",
      borderVisible: false,
      wickUpColor: "#26A69A",
      wickDownColor: "#EF5350",
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = createSeriesMarkers(series, []);

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
      priceLinesRef.current = [];
    };
  }, [restricted]);

  // --- History load + live tick stream (per symbol) ---
  useEffect(() => {
    if (restricted) return;
    const series = seriesRef.current;
    if (!series) return;

    let cancelled = false;
    setLoading(true);
    setSignals([]);

    scalperRef.current = new ScalperLiteCalculator({
      halfLength: 55,
      appliedPrice: "WEIGHTED",
      bandsDeviations: 2.5,
      arrowOffset: anchorPrice * 0.0005,
    });

    series.applyOptions({
      priceFormat: {
        type: "price",
        precision: spec.digits,
        minMove: Number(`1e-${spec.digits}`),
      },
    });

    fetchHistory(spec.id, interval, HISTORY_CANDLES).then((candles) => {
      if (cancelled || !seriesRef.current) return;

      seriesRef.current.setData(
        candles.map((c) => ({
          time: toTime(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      lastCandleRef.current = candles[candles.length - 1] ?? null;
      rangeRef.current = {
        first: candles[0]?.time ?? 0,
        last: candles[candles.length - 1]?.time ?? 0,
      };
      candlesRef.current = candles;
      setSignals(scalperRef.current?.calculate(candles) ?? []);
      // Open on the recent tape rather than the whole history, with the window
      // sized to the pane so candles stay readable on a phone.
      const width = containerRef.current?.clientWidth ?? MOBILE_BREAKPOINT;
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: Math.max(0, candles.length - visibleCandles(width)),
        to: candles.length + RIGHT_MARGIN_BARS,
      });
      setLoading(false);
    });

    // Each tick either extends the current bar or opens the next one — the same
    // job MT5 does when it paints the rightmost candle.
    const unsubscribe = subscribeToPrice(spec.id, (price) => {
      const liveSeries = seriesRef.current;
      if (!liveSeries) return;

      const time = bucketAt(Date.now(), interval);
      const last = lastCandleRef.current;

      if (!last || time > last.time) {
        // The previous bar is now final: fold it into the indicator history.
        if (last) {
          const closed = [...candlesRef.current.filter((c) => c.time !== last.time), last];
          candlesRef.current = closed.slice(-400);
          setSignals(scalperRef.current?.calculate(candlesRef.current) ?? []);
        }

        const open = last ? last.close : price;
        const candle: Candle = {
          time,
          open,
          high: Math.max(open, price),
          low: Math.min(open, price),
          close: price,
        };
        lastCandleRef.current = candle;
        rangeRef.current.last = time;
        liveSeries.update({
          time: toTime(candle.time),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        });
        return;
      }

      if (time < last.time) return; // stale tick, ignore

      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      last.close = price;
      liveSeries.update({
        time: toTime(last.time),
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [spec.id, spec.digits, interval, anchorPrice, restricted]);

  // --- Indicator signals ---
  // Positions are drawn only as price lines below. An arrow marker attaches to
  // a candle, so it marks the time a trade filled and floats at whatever the
  // price was on that bar — never at the entry price — which reads as a
  // misplaced marker next to the position's own line.
  useEffect(() => {
    if (restricted || !markersRef.current) return;

    const markers: SeriesMarker<Time>[] = signals.map((signal) => {
      const isBuy = signal.type === "BUY" || signal.type === "BUY_CONFIRM";
      return {
        time: toTime(signal.time),
        position: isBuy ? "belowBar" : "aboveBar",
        shape: signal.type.endsWith("CONFIRM") ? "square" : "circle",
        color: isBuy ? "#D4AF37" : "#B8860B",
        size: 0.6,
      };
    });

    // The plugin requires markers in ascending time order.
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    markersRef.current.setMarkers(markers);
  }, [signals, spec.id, restricted, loading]);

  // --- Entry / SL / TP price lines for open positions ---
  useEffect(() => {
    if (restricted) return;
    const series = seriesRef.current;
    if (!series) return;

    priceLinesRef.current.forEach((line) => series.removePriceLine(line));
    priceLinesRef.current = [];

    for (const trade of trades) {
      if (getSpec(trade.symbol).id !== spec.id) continue;
      const color = trade.type === "BUY" ? BUY_COLOR : SELL_COLOR;

      priceLinesRef.current.push(
        series.createPriceLine({
          price: trade.entryPrice,
          color,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: isNarrow
            ? `${trade.type} ${trade.lot.toFixed(2)}`
            : `${trade.type} ${trade.lot.toFixed(2)} @ ${trade.entryPrice.toFixed(spec.digits)}`,
        })
      );

      if (trade.sl !== undefined) {
        priceLinesRef.current.push(
          series.createPriceLine({
            price: trade.sl,
            color: SL_COLOR,
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: "SL",
          })
        );
      }

      if (trade.tp !== undefined) {
        priceLinesRef.current.push(
          series.createPriceLine({
            price: trade.tp,
            color: TP_COLOR,
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: "TP",
          })
        );
      }
    }
  }, [trades, spec.id, spec.digits, restricted, loading, isNarrow]);

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full glow-border-gold overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{spec.display}</span>
          <span className="text-xs text-muted-foreground">{spec.name}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
            {timeframeLabel(interval)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              session.open
                ? "bg-profit/10 text-profit border border-profit/20"
                : "bg-loss/10 text-loss border border-loss/20"
            }`}
            title={session.label}
          >
            {session.open ? "MARKET OPEN" : "MARKET CLOSED"}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {session.label}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isLiveFeed(spec.id)
                ? "bg-profit/10 text-profit border border-profit/20"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {isLiveFeed(spec.id) ? "LIVE DATA" : "SIMULATED"}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {restricted ? (
          <div className="w-full h-full flex items-center justify-center bg-muted/20 text-muted-foreground flex-col gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Chart Access Restricted</h3>
              <p className="text-sm mt-1 max-w-md">
                Live trading charts are currently unavailable for your account level. Please
                contact support or upgrade your plan to unlock this feature.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div ref={containerRef} className="absolute inset-0" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                Loading {spec.display} candles…
              </div>
            )}
            {!loading && !session.open && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-background/85 border border-loss/30 backdrop-blur-sm pointer-events-none">
                <p className="text-[11px] font-bold text-loss text-center">
                  Market closed — weekend
                </p>
                <p className="text-[10px] text-muted-foreground text-center">
                  {session.label}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
