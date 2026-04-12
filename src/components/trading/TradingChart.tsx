import { useEffect } from "react";
import { subscribeToPrice } from "@/services/priceService";
import { calculatePnL } from "@/utils/pnlCalculator";
import { useStore } from "@/state/store";

interface Props {
  symbol: string;
}

export function TradingChart({ symbol }: Props) {
  const { setCurrentPrice, setFloatingPnL, setActiveTrade, activeTrade } = useStore();

  useEffect(() => {
    // Real-time engine for PnL and other stats
    // This replaces polling and artificial simulation ticks
    const unsubscribe = subscribeToPrice(symbol, (latestPrice) => {
      // Update global state immediately (no artificial smoothing)
      setCurrentPrice(latestPrice);
      
      const pnl = calculatePnL(
        activeTrade.direction, 
        activeTrade.entryPrice, 
        latestPrice, 
        activeTrade.lotSize, 
        activeTrade.multiplier
      );
      setFloatingPnL(pnl);
      
      // Update active trade state
      setActiveTrade({
        ...activeTrade,
        asset: symbol,
        currentPrice: latestPrice,
        profit: pnl,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [symbol, activeTrade.direction, activeTrade.entryPrice, activeTrade.lotSize, activeTrade.multiplier, setActiveTrade, setCurrentPrice, setFloatingPnL]);

  const iframeSrc = `https://s.tradingview.com/widgetembed/?symbol=${symbol}&interval=1&theme=dark&style=1&timezone=Etc%2FUTC&studies=[]&hide_side_toolbar=1&allow_symbol_change=0&saveimage=0&details=0&calendar=0&hotlist=0&news=0&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${symbol}`;

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full glow-border-gold overflow-hidden">
      <div className="flex-1 min-h-0 relative">
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
      </div>
    </div>
  );
}

