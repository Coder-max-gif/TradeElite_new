import { useEffect } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/state/store";

export function ActiveTrade() {
  const { activeTrade, currentPrice, floatingPnL, setFloatingPnL, setActiveTrade, setCurrentPrice, balance } = useStore();
  const { entryPrice, lotSize, multiplier, asset, direction } = activeTrade;

  useEffect(() => {
    // The store's setCurrentPrice and setFloatingPnL are already being updated by TradingChart.tsx
    // We don't need a separate interval here which causes flickering.
    // The component will naturally re-render when the store state changes.
  }, []);

  const profitPercent = balance > 0 ? (floatingPnL / balance) * 100 : 0;
  const isPositive = floatingPnL >= 0;

  return (
    <div className="glass-panel rounded-xl p-4 glow-border-profit">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">Active Trade</h3>
        <span className="px-2 py-0.5 text-xs font-bold rounded bg-profit/20 text-profit">{direction}</span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Asset</span>
          <span className="font-semibold text-primary">{asset}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Lot Size</span>
          <span className="font-mono text-foreground">{lotSize}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Entry</span>
          <span className="font-mono text-foreground">${entryPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Current</span>
          <motion.span
            key={currentPrice.toFixed(2)}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="font-mono text-foreground"
          >
            ${currentPrice.toFixed(2)}
          </motion.span>
        </div>

        <div className="border-t border-border pt-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Profit</span>
            <motion.span
              key={Math.floor(floatingPnL)}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className={`text-lg font-bold ${isPositive ? "text-profit glow-profit" : "text-loss"}`}
            >
              {isPositive ? "+" : ""}${Math.abs(floatingPnL).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </motion.span>
          </div>
        </div>

        <div className="relative h-2 bg-accent rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full ${isPositive ? "bg-gradient-to-r from-profit to-primary" : "bg-gradient-to-r from-loss to-destructive"}`}
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(Math.max(Math.abs(profitPercent) * 2, 5), 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <p className={`text-xs text-center ${isPositive ? "text-profit" : "text-loss"}`}>
          {isPositive ? "+" : ""}{profitPercent.toFixed(2)}% {isPositive ? "in profit" : "in loss"}
        </p>
      </div>
    </div>
  );
}
