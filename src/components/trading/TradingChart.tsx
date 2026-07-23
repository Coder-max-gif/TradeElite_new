import { useEffect, useState, useRef } from "react";
import { subscribeToPrice } from "@/services/priceService";
import { calculateTotalPnL } from "@/utils/pnlCalculator";
import { useStore } from "@/state/store";
import { ScalperLiteCalculator, Signal } from "@/lib/indicators/scalperLite";
import { CandleBuilder } from "@/services/candleBuilder";
import { TradingOverlay } from "./TradingOverlay";

interface Props {
  symbol: string;
}

export function TradingChart({ symbol }: Props) {
  const { setCurrentPrice, setFloatingPnL, trades, user } = useStore();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [minPrice, setMinPrice] = useState(4700);
  const [maxPrice, setMaxPrice] = useState(4800);
  
  // Persistence for indicator state
  const candleBuilderRef = useRef(new CandleBuilder(1));
  const scalperRef = useRef(new ScalperLiteCalculator({
    halfLength: 55,
    appliedPrice: "WEIGHTED",
    bandsDeviations: 2.5,
    arrowOffset: 5.0 // Adjusted for XAUUSD scale
  }));

  // Reset state when symbol changes
  useEffect(() => {
    candleBuilderRef.current = new CandleBuilder(1);
    scalperRef.current = new ScalperLiteCalculator({
      halfLength: 55,
      appliedPrice: "WEIGHTED",
      bandsDeviations: 2.5,
      arrowOffset: symbol.includes("BTC") ? 50 : (symbol.includes("XAU") ? 5 : 0.0005)
    });
    setSignals([]);
  }, [symbol]);

  useEffect(() => {
    // Real-time engine for PnL and other stats
    const unsubscribe = subscribeToPrice("OANDA:XAUUSD", (latestPrice) => {
      // 1. Update global state
      setCurrentPrice(latestPrice);
      // Keep floating P/L fixed at the requested account value.
      // const totalPnL = calculateTotalPnL(trades, latestPrice);
      // setFloatingPnL(totalPnL);

      // 2. Process indicator logic
      const isNewCandle = candleBuilderRef.current.addTick(latestPrice);
      
      if (isNewCandle) {
        console.log("New candle closed, recalculating indicators...");
        const candles = candleBuilderRef.current.getClosedCandles();
        if (candles.length > 10) { // Reduced warm-up for testing
          const newSignals = scalperRef.current.updateLatest(candles);
          console.log("New signals generated:", newSignals.length);
          setSignals(prev => {
            // Merge signals to maintain non-repainting history
            const freshTimes = new Set(newSignals.map(s => s.time));
            const filtered = prev.filter(s => !freshTimes.has(s.time));
            return [...filtered, ...newSignals].sort((a, b) => a.time - b.time);
          });

          // Dynamic scale for overlay
          const prices = candles.slice(-20).flatMap(c => [c.high, c.low]);
          setMinPrice(Math.min(...prices) * 0.999);
          setMaxPrice(Math.max(...prices) * 1.001);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [trades, setCurrentPrice, setFloatingPnL]);

  // To add horizontal lines in TradingView iframe, we can inject 'studies' or 'range'.
  // However, simple iframe widgets do not natively support passing arbitrary horizontal lines
  // easily via URL params without pine scripts. We will enforce the symbol as requested.
  const iframeSrc = `https://s.tradingview.com/widgetembed/?symbol=OANDA:XAUUSD&interval=1&theme=dark&style=1&timezone=Etc%2FUTC&hide_side_toolbar=1&allow_symbol_change=0&saveimage=0&details=0&calendar=0&hotlist=0&news=0&utm_source=localhost&utm_medium=widget&utm_campaign=chart`;

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full glow-border-gold overflow-hidden relative">
      {/* Indicator Overlay */}
      <div className="absolute inset-0 z-[100] pointer-events-none">
        <TradingOverlay 
          signals={signals} 
          minPrice={minPrice} 
          maxPrice={maxPrice} 
        />
      </div>

      <div className="flex-1 min-h-0 relative">
        {user.name === "HITESH" ? (
          <div className="w-full h-full flex items-center justify-center bg-muted/20 text-muted-foreground flex-col gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Chart Access Restricted</h3>
              <p className="text-sm mt-1 max-w-md">Live trading charts are currently unavailable for your account level. Please contact support or upgrade your plan to unlock this feature.</p>
            </div>
          </div>
        ) : (
          <iframe 
            key={symbol}
            src={iframeSrc}
            width="100%" 
            height="100%" 
            frameBorder="0" 
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title="TradingView Chart"
          />
        )}
      </div>
    </div>
  );
}
