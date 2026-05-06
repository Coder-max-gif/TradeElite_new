/**
 * scalperLite.ts
 * ScalperLite / TMA Non-Repainting Arrow Indicator
 * Original author: Star (bdanny577@gmail.com) — MQL5 v1.05
 * TypeScript port: production-grade, Bun/Cloudflare-compatible
 */

// --- Public types ---

/** OHLCV candle input */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Signal type matches MQL5 arrow semantics exactly */
export type SignalType = "BUY" | "SELL" | "BUY_CONFIRM" | "SELL_CONFIRM";

export interface Signal {
  time: number;
  type: SignalType;
  price: number;
}

/** Price mode enum - matches ENUM_APPLIED_PRICE from MQL5 */
export type AppliedPrice =
  | "CLOSE"
  | "OPEN"
  | "HIGH"
  | "LOW"
  | "MEDIAN"
  | "TYPICAL"
  | "WEIGHTED";

/** Indicator configuration */
export interface ScalperLiteConfig {
  /** Half-window for TMA; full window = 2*halfLength+1. Default: 55. */
  halfLength?: number;
  /** Price source for TMA calculation. Default: "WEIGHTED". */
  appliedPrice?: AppliedPrice;
  /** Band standard deviation multiplier. Default: 2.5. */
  bandsDeviations?: number;
  /** Arrow offset from bar extreme. Default: 0.0005. */
  arrowOffset?: number;
}

// --- Internal state ---

interface InternalBar {
  tma: number;
  upperBand: number;
  lowerBand: number;
  wUp: number; // one-sided upper variance accumulator
  wDn: number; // one-sided lower variance accumulator
}

// --- Exported stateful calculator class ---

export class ScalperLiteCalculator {
  private readonly halfLength: number;
  private readonly appliedPrice: AppliedPrice;
  private readonly bandsDeviations: number;
  private readonly arrowOffset: number;

  // Internal ring of computed bars
  private bars: InternalBar[] = [];

  constructor(config: ScalperLiteConfig = {}) {
    this.halfLength = Math.max(config.halfLength ?? 55, 1);
    this.appliedPrice = config.appliedPrice ?? "WEIGHTED";
    this.bandsDeviations = config.bandsDeviations ?? 2.5;
    this.arrowOffset = config.arrowOffset ?? 0.0005;
  }

  // --- Public API ---

  /** Full historical calculation */
  calculate(candles: Readonly<Candle[]>): Signal[] {
    const n = candles.length;
    const hl = this.halfLength;

    if (n <= hl) return [];

    // Pass 1: compute TMA + bands for every bar
    this.bars = new Array(n);
    for (let i = 0; i < n; i++) {
      this.bars[i] = this._computeTmaBar(i, candles);
    }

    // Pass 2: alternating signal scan (oldest -> newest)
    return this._scanSignals(candles, 0, n - 1);
  }

  /** Incremental update */
  updateLatest(candles: Readonly<Candle[]>): Signal[] {
    const n = candles.length;
    const hl = this.halfLength;

    if (n <= hl) return [];

    // Extend internal bar array if new candles arrived
    while (this.bars.length < n) {
      this.bars.push({ tma: 0, upperBand: 0, lowerBand: 0, wUp: 0, wDn: 0 });
    }

    // Recalculate the affected window: last halfLength+1 bars
    const recalcStart = Math.max(0, n - hl - 1);
    for (let i = recalcStart; i < n; i++) {
      this.bars[i] = this._computeTmaBar(i, candles);
    }

    // Re-scan signals in the recalculation window
    return this._scanSignals(candles, 0, n - 1);
  }

  // --- Core calculation helpers ---

  static calculateTMA(
    pos: number,
    candles: Readonly<Candle[]>,
    halfLength: number,
    appliedPrice: AppliedPrice
  ): number {
    const n = candles.length;
    const center = getAppliedPrice(candles[pos], appliedPrice);

    let sum = (halfLength + 1) * center;
    let sumW = halfLength + 1;

    for (let j = 1, k = halfLength; j <= halfLength; j++, k--) {
      if (pos + j < n) {
        sum += k * getAppliedPrice(candles[pos + j], appliedPrice);
        sumW += k;
      }
      if (pos - j >= 0) {
        sum += k * getAppliedPrice(candles[pos - j], appliedPrice);
        sumW += k;
      }
    }

    return sum / sumW;
  }

  // --- Private implementation ---

  private _computeTmaBar(pos: number, candles: Readonly<Candle[]>): InternalBar {
    const hl = this.halfLength;
    const fullLength = 2.0 * hl + 1.0;
    const n = candles.length;

    const tma = ScalperLiteCalculator.calculateTMA(
      pos,
      candles,
      hl,
      this.appliedPrice
    );

    const price = getAppliedPrice(candles[pos], this.appliedPrice);
    const diff = price - tma;
    const diffSq = diff * diff;

    let wUp: number;
    let wDn: number;

    // Seed region: bars near the end of the lookback
    if (pos < hl + 1 || pos >= n - hl - 1) {
      wUp = diff > 0 ? diffSq : 0;
      wDn = diff < 0 ? diffSq : 0;
    } else {
      // Recursive EMA update from the PREVIOUS (older) bar
      const prev = this.bars[pos - 1];
      if (diff >= 0) {
        wUp = (prev.wUp * (fullLength - 1) + diffSq) / fullLength;
        wDn = (prev.wDn * (fullLength - 1)) / fullLength;
      } else {
        wDn = (prev.wDn * (fullLength - 1) + diffSq) / fullLength;
        wUp = (prev.wUp * (fullLength - 1)) / fullLength;
      }
    }

    const upperBand = tma + this.bandsDeviations * Math.sqrt(wUp);
    const lowerBand = tma - this.bandsDeviations * Math.sqrt(wDn);

    return { tma, upperBand, lowerBand, wUp, wDn };
  }

  private _scanSignals(
    candles: Readonly<Candle[]>,
    startIdx: number,
    endIdx: number
  ): Signal[] {
    const signals: Signal[] = [];
    const hl = this.halfLength;
    const offset = this.arrowOffset;

    // Alternating gate: 0=none, 1=last was buy, -1=last was sell
    let lastSignal = 0;

    const from = Math.max(startIdx, hl + 1);

    for (let i = from; i <= endIdx; i++) {
      const cur = this.bars[i];
      const prev = this.bars[i - 1];

      if (!cur || !prev) continue;

      // Guard: skip if bands are not yet seeded
      if (cur.upperBand === 0 && cur.lowerBand === 0) continue;

      const c = candles[i]; // confirmation candle (arrow bar)
      const p = candles[i - 1]; // trigger candle (older, closed)

      // --- Strong SELL: prior bar pierced upper band AND current bar is bearish AND TMA is declining
      const sellStrong =
        p.high > prev.upperBand &&
        p.close > p.open &&
        c.close < c.open &&
        cur.tma < prev.tma;

      // --- Weak SELL: same band pierce + reversal, no TMA filter
      const sellWeak = p.high > prev.upperBand && p.close > p.open && c.close < c.open;

      // --- Strong BUY: prior bar pierced lower band AND current bar is bullish AND TMA is rising
      const buyStrong =
        p.low < prev.lowerBand &&
        p.close < p.open &&
        c.close > c.open &&
        cur.tma > prev.tma;

      // --- Weak BUY: same band pierce + reversal, no TMA filter
      const buyWeak = p.low < prev.lowerBand && p.close < p.open && c.close > c.open;

      // --- Alternating gate: SELL signals
      if (lastSignal !== -1) {
        if (sellStrong) {
          signals.push({
            time: c.time,
            type: "SELL",
            price: c.high + offset,
          });
          lastSignal = -1;
          continue;
        } else if (sellWeak) {
          signals.push({
            time: c.time,
            type: "SELL_CONFIRM",
            price: c.high + offset,
          });
          lastSignal = -1;
          continue;
        }
      }

      // --- Alternating gate: BUY signals
      if (lastSignal !== 1) {
        if (buyStrong) {
          signals.push({
            time: c.time,
            type: "BUY",
            price: c.low - offset,
          });
          lastSignal = 1;
          continue;
        } else if (buyWeak) {
          signals.push({
            time: c.time,
            type: "BUY_CONFIRM",
            price: c.low - offset,
          });
          lastSignal = 1;
          continue;
        }
      }
    }

    return signals;
  }
}

// --- Pure exported functions (functional API) ---

/**
 * Maps a price-type selector to the numeric value for a single candle.
 */
export function getAppliedPrice(
  candle: Readonly<Candle>,
  mode: AppliedPrice
): number {
  switch (mode) {
    case "CLOSE":
      return candle.close;
    case "OPEN":
      return candle.open;
    case "HIGH":
      return candle.high;
    case "LOW":
      return candle.low;
    case "MEDIAN":
      return (candle.high + candle.low) / 2.0;
    case "TYPICAL":
      return (candle.high + candle.low + candle.close) / 3.0;
    case "WEIGHTED":
    default:
      // (H + L + C + C) / 4 - matches MQL5 PRICE_WEIGHTED
      return (candle.high + candle.low + candle.close + candle.close) / 4.0;
  }
}

export function calculateTMA(
  candles: Readonly<Candle[]>,
  halfLength: number = 55,
  appliedPrice: AppliedPrice = "WEIGHTED"
): Float64Array {
  const n = candles.length;
  const out = new Float64Array(n).fill(NaN);
  for (let i = halfLength; i < n; i++) {
    out[i] = ScalperLiteCalculator.calculateTMA(
      i,
      candles,
      halfLength,
      appliedPrice
    );
  }
  return out;
}

/**
 * Convenience wrapper for one-shot historical processing.
 */
export function generateSignals(
  candles: Readonly<Candle[]>,
  config: ScalperLiteConfig = {}
): Signal[] {
  return new ScalperLiteCalculator(config).calculate(candles);
}

/**
 * Re-runs the trailing recalculation window on an existing calculator instance.
 */
export function updateLatestSignal(
  calculator: ScalperLiteCalculator,
  candles: Readonly<Candle[]>
): Signal[] {
  return calculator.updateLatest(candles);
}

/**
 * Merge signals by replacing existing ones with fresh ones for the same timestamps.
 */
export function mergeSignals(existing: Signal[], fresh: Signal[]): Signal[] {
  if (fresh.length === 0) return existing;

  const freshTimes = new Set(fresh.map((s) => s.time));
  const filtered = existing.filter((s) => !freshTimes.has(s.time));
  return [...filtered, ...fresh].sort((a, b) => a.time - b.time);
}
