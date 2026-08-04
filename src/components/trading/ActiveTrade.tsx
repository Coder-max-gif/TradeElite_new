import { motion } from "framer-motion";
import { useStore } from "@/state/store";
import { useAnimatedValue } from "@/hooks/useAnimatedValue";
import { calculateTradePnL } from "@/utils/pnlCalculator";
import { formatSignedCurrency, formatPrice, formatLots } from "@/utils/format";

export function ActiveTrade() {
  const { trades, currentPrice, floatingPnL } = useStore();
  const animatedFloatingPnL = useAnimatedValue(floatingPnL, 4);

  const totalBuyLots = trades.filter(t => t.type === "BUY").reduce((acc, t) => acc + t.lot, 0);
  const totalSellLots = trades.filter(t => t.type === "SELL").reduce((acc, t) => acc + t.lot, 0);
  const netExposure = totalBuyLots - totalSellLots;
  const isPositive = animatedFloatingPnL >= 0;

  return (
    <div className="glass-panel rounded-xl p-4 glow-border-profit overflow-hidden flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">Open Positions</h3>
        <span className="px-2 py-0.5 text-xs font-bold rounded bg-primary/20 text-primary">{trades.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium text-right">Lot</th>
              <th className="pb-2 font-medium text-right">Entry</th>
              <th className="pb-2 font-medium text-right">Current</th>
              <th className="pb-2 font-medium text-right">PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {trades.map((trade) => {
              const pnl = calculateTradePnL(trade, currentPrice);
              const isTradePositive = pnl >= 0;
              return (
                <tr key={trade.id} className="hover:bg-accent/5 transition-colors">
                  <td className="py-2">
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${trade.type === 'BUY' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'}`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono">{formatLots(trade.lot)}</td>
                  <td className="py-2 text-right font-mono">{formatPrice(trade.entryPrice)}</td>
                  <td className="py-2 text-right font-mono">
                    <motion.span
                      key={formatPrice(currentPrice)}
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 1 }}
                    >
                      {formatPrice(currentPrice)}
                    </motion.span>
                  </td>
                  <td className="py-2 text-right font-mono">
                    <motion.span
                      key={Math.floor(pnl)}
                      initial={{ scale: 1.02 }}
                      animate={{ scale: 1 }}
                      className={isTradePositive ? "text-profit" : "text-loss"}
                    >
                      {formatSignedCurrency(pnl)}
                    </motion.span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total Buy Lots</span>
          <span className="font-mono text-foreground">{formatLots(totalBuyLots)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total Sell Lots</span>
          <span className="font-mono text-foreground">{formatLots(totalSellLots)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Net Exposure</span>
          <span className="font-mono text-foreground">{netExposure > 0 ? "+" : ""}{formatLots(netExposure)}</span>
        </div>
        
        <div className="pt-2 mt-2 border-t border-border/50 flex justify-between items-center">
          <span className="text-muted-foreground text-sm font-semibold">Total Floating PnL</span>
          <motion.span
            key={Math.floor(animatedFloatingPnL)}
            initial={{ scale: 1.02 }}
            animate={{ scale: 1 }}
            className={`text-lg font-bold ${isPositive ? "text-profit glow-profit" : "text-loss glow-loss"}`}
          >
            {formatSignedCurrency(animatedFloatingPnL)}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
