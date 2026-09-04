import { useMemo } from "react";
import { useStore } from "@/state/store";
import { calculateClosedTradePnL } from "@/utils/pnlCalculator";
import { getSpec } from "@/lib/symbols";
import { formatSignedCurrency, formatDate, formatLots } from "@/utils/format";

/** Badge shown for stop-triggered closes, matching the MT5 deal reason. */
const REASON_LABEL: Record<string, string> = { SL: "SL", TP: "TP" };

export function TradeHistory() {
  const { closedTrades } = useStore();

  // Seeded books are written oldest-first while live closes are prepended, so
  // the list is sorted here rather than trusting either order.
  const history = useMemo(
    () =>
      [...closedTrades].sort(
        (a, b) => Date.parse(b.closeDate) - Date.parse(a.closeDate)
      ),
    [closedTrades]
  );

  return (
    <div className="glass-panel rounded-xl p-4 glow-border-gold">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">
          Trade History
        </h3>
        <span className="text-xs text-muted-foreground">{history.length}</span>
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          Closed trades will appear here.
        </p>
      ) : (
        <div className="space-y-2 max-h-[70vh] sm:max-h-72 overflow-auto touch-scroll scrollbar-thin">
          {history.map((t) => {
            const spec = getSpec(t.symbol);
            const profit = calculateClosedTradePnL(t);
            const reason = t.closeReason ? REASON_LABEL[t.closeReason] : undefined;

            return (
              <div
                key={t.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      t.type === "BUY" ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
                    }`}
                  >
                    {t.type}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {spec.display}{" "}
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatLots(t.lot)}
                      </span>
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {t.entryPrice.toFixed(spec.digits)} → {t.exitPrice.toFixed(spec.digits)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span
                    className={`text-sm font-bold font-mono ${
                      profit >= 0 ? "text-profit" : "text-loss"
                    }`}
                  >
                    {formatSignedCurrency(profit)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    {reason && (
                      <span
                        className={`mr-1 font-bold ${
                          reason === "TP" ? "text-profit" : "text-loss"
                        }`}
                      >
                        {reason}
                      </span>
                    )}
                    {formatDate(t.closeDate)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
