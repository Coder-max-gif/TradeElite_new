import { useEffect } from "react";
import { subscribeToPrice } from "@/services/priceService";
import { calculateTotalPnL } from "@/utils/pnlCalculator";
import { useStore } from "@/state/store";

interface Props {
  symbol: string;
}

export function TradingChart({ symbol }: Props) {
  const { setCurrentPrice, setFloatingPnL, trades } = useStore();

  useEffect(() => {
    // Real-time engine for PnL and other stats
    // We strictly subscribe to XAUUSD for the PnL calculation to match our fixed positions.
    const unsubscribe = subscribeToPrice("OANDA:XAUUSD", (latestPrice) => {
      // Update global state immediately
      setCurrentPrice(latestPrice);
      
      const totalPnL = calculateTotalPnL(trades, latestPrice);
      setFloatingPnL(totalPnL);
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
