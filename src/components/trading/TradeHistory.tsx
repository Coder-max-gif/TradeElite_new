import { formatSignedCurrency, formatDate } from "@/utils/format";

const trades = [
  { id: 1, type: "BUY", asset: "Gold Futures (GC)", profit: 45000, date: "2026-08-03" },
  { id: 2, type: "SELL", asset: "BTC/USD", profit: 12000, date: "2026-08-01" },
  { id: 3, type: "BUY", asset: "EUR/USD", profit: -3000, date: "2026-07-30" },
  { id: 4, type: "BUY", asset: "NAS100", profit: 28500, date: "2026-07-28" },
  { id: 5, type: "SELL", asset: "GBP/USD", profit: 8700, date: "2026-07-25" },
];

export function TradeHistory() {
  return (
    <div className="glass-panel rounded-xl p-4 glow-border-gold">
      <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Trade History</h3>
      <div className="space-y-2">
        {trades.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                t.type === "BUY" ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
              }`}>
                {t.type}
              </span>
              <span className="text-sm font-medium text-foreground">{t.asset}</span>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold font-mono ${t.profit >= 0 ? "text-profit" : "text-loss"}`}>
                {formatSignedCurrency(t.profit)}
              </span>
              <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
