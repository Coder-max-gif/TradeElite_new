import { motion } from "framer-motion";

const stats = [
  { label: "Daily Profit", value: "+18%", color: "text-profit glow-profit" },
  { label: "Win Rate", value: "87%", color: "text-primary glow-gold" },
  { label: "Total Trades", value: "124", color: "text-foreground" },
];

export function PerformanceCards() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-panel rounded-xl p-4 text-center glow-border-gold"
        >
          <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
