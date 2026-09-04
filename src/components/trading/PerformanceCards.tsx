import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/state/store";
import { calculateClosedTradePnL } from "@/utils/pnlCalculator";
import { formatCurrency, formatSignedCurrency } from "@/utils/format";

export function PerformanceCards() {
  const { closedTrades, closedProfit, usedMargin, freeMargin, marginLevel } = useStore();

  const winRate = useMemo(() => {
    if (closedTrades.length === 0) return null;
    const wins = closedTrades.filter((t) => calculateClosedTradePnL(t) > 0).length;
    return (wins / closedTrades.length) * 100;
  }, [closedTrades]);

  const stats = [
    {
      label: "Closed P/L",
      value: formatSignedCurrency(closedProfit),
      color: closedProfit >= 0 ? "text-profit glow-profit" : "text-loss glow-loss",
    },
    {
      label: "Win Rate",
      value: winRate === null ? "—" : `${winRate.toFixed(0)}%`,
      color: "text-primary glow-gold",
    },
    {
      label: "Closed Trades",
      value: String(closedTrades.length),
      color: "text-foreground",
    },
    {
      label: "Used Margin",
      value: formatCurrency(usedMargin),
      color: "text-foreground",
    },
    {
      label: "Free Margin",
      value: formatCurrency(freeMargin),
      color: freeMargin >= 0 ? "text-foreground" : "text-loss",
    },
    {
      label: "Margin Level",
      // No open position means no margin in use, which MT5 shows as a dash.
      value: Number.isFinite(marginLevel) ? `${marginLevel.toFixed(0)}%` : "—",
      color:
        Number.isFinite(marginLevel) && marginLevel < 100
          ? "text-loss glow-loss"
          : "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-panel rounded-xl p-2.5 sm:p-3 text-center glow-border-gold min-w-0"
        >
          <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">
            {s.label}
          </p>
          <p className={`text-base sm:text-lg font-bold font-mono tabular-nums truncate ${s.color}`}>{s.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
