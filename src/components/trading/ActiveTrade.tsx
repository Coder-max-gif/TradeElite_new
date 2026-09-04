import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil } from "lucide-react";
import { useStore } from "@/state/store";
import { useAnimatedValue } from "@/hooks/useAnimatedValue";
import { calculateTradePnL } from "@/utils/pnlCalculator";
import { getSpec, isSymbolOpen } from "@/lib/symbols";
import { formatSignedCurrency, formatLots } from "@/utils/format";

export function ActiveTrade() {
  const { trades, priceOf, floatingPnL, closeTrade, closeAllTrades, modifyTrade, now } =
    useStore();
  // Which position has its stop/target editor open, and what is typed into it.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ sl: "", tp: "" });
  const [error, setError] = useState<string | null>(null);

  const beginEdit = (id: string, sl?: number, tp?: number) => {
    setEditing(id);
    setError(null);
    setDraft({ sl: sl?.toString() ?? "", tp: tp?.toString() ?? "" });
  };

  /** Blank clears the level; anything else is parsed as a price. */
  const parseLevel = (raw: string): number | null => {
    const trimmed = raw.trim();
    return trimmed === "" ? null : Number(trimmed);
  };

  const saveEdit = (id: string) => {
    const result = modifyTrade(id, {
      sl: parseLevel(draft.sl),
      tp: parseLevel(draft.tp),
    });
    if (result.ok) {
      setEditing(null);
      setError(null);
    } else {
      setError(result.error);
    }
  };
  // A position can only be closed while its own market is trading.
  const anyClosable = trades.some((t) => isSymbolOpen(t.symbol, new Date(now)));
  const animatedFloatingPnL = useAnimatedValue(floatingPnL, 4);

  const isPositive = animatedFloatingPnL >= 0;

  return (
    <div className="glass-panel rounded-xl p-4 glow-border-profit overflow-hidden flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">
          Open Positions
        </h3>
        <div className="flex items-center gap-2">
          {trades.length > 0 && anyClosable && (
            <button
              onClick={closeAllTrades}
              className="text-[10px] font-bold px-3 py-3.5 sm:px-2 sm:py-0.5 rounded bg-loss/15 text-loss hover:bg-loss/25 transition-colors"
            >
              CLOSE ALL
            </button>
          )}
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-primary/20 text-primary">
            {trades.length}
          </span>
        </div>
      </div>

      {trades.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No open positions. Place an order to get started.
        </p>
      ) : (
        // Two lines per position: the sidebar is too narrow for a table wide
        // enough to hold symbol, lots, both prices and P/L without colliding.
        <div className="flex flex-col gap-1.5 max-h-[52vh] sm:max-h-64 overflow-auto touch-scroll scrollbar-thin">
          {trades.map((trade) => {
            const spec = getSpec(trade.symbol);
            // Value on the mid, exactly as the store totals it, so these rows
            // always add up to the Total Floating PnL below. The spread is
            // charged where it belongs — on the fill, when the order is placed
            // and again when it is closed.
            const mid = priceOf(trade.symbol);
            const pnl = calculateTradePnL(trade, mid);
            const isTradePositive = pnl >= 0;
            const closable = isSymbolOpen(trade.symbol, new Date(now));

            return (
              <div
                key={trade.id}
                className="group rounded-lg bg-accent/20 hover:bg-accent/40 transition-colors px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded shrink-0 ${
                        trade.type === "BUY"
                          ? "bg-profit/20 text-profit"
                          : "bg-loss/20 text-loss"
                      }`}
                    >
                      {trade.type}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {spec.display}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                      {formatLots(trade.lot)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <motion.span
                      key={Math.floor(pnl)}
                      initial={{ scale: 1.02 }}
                      animate={{ scale: 1 }}
                      className={`text-xs font-bold font-mono ${
                        isTradePositive ? "text-profit" : "text-loss"
                      }`}
                    >
                      {formatSignedCurrency(pnl)}
                    </motion.span>
                    <button
                      onClick={() =>
                        editing === trade.id
                          ? setEditing(null)
                          : beginEdit(trade.id, trade.sl, trade.tp)
                      }
                      disabled={!closable}
                      title={closable ? "Edit stop loss / take profit" : "Market closed"}
                      className="grid place-items-center h-11 w-11 sm:h-6 sm:w-6 -my-2.5 sm:my-0 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => closeTrade(trade.id)}
                      disabled={!closable}
                      title={closable ? "Close position" : "Market closed"}
                      className="grid place-items-center h-11 w-11 sm:h-6 sm:w-6 -my-2.5 sm:my-0 rounded hover:bg-loss/20 text-muted-foreground hover:text-loss transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-muted-foreground">
                  <span>{trade.entryPrice.toFixed(spec.digits)}</span>
                  <span className="opacity-50">→</span>
                  <span className="text-foreground/70">{mid.toFixed(spec.digits)}</span>
                  {trade.sl !== undefined && (
                    <span className="text-loss/70">SL {trade.sl.toFixed(spec.digits)}</span>
                  )}
                  {trade.tp !== undefined && (
                    <span className="text-profit/70">TP {trade.tp.toFixed(spec.digits)}</span>
                  )}
                </div>

                <AnimatePresence>
                  {editing === trade.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 mt-2 border-t border-border/50 space-y-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">
                              Stop Loss
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="none"
                              value={draft.sl}
                              onChange={(e) => setDraft((d) => ({ ...d, sl: e.target.value }))}
                              className="w-full bg-input border border-border rounded px-1.5 py-1 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">
                              Take Profit
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="none"
                              value={draft.tp}
                              onChange={(e) => setDraft((d) => ({ ...d, tp: e.target.value }))}
                              className="w-full bg-input border border-border rounded px-1.5 py-1 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>

                        {error && <p className="text-[10px] text-loss leading-snug">{error}</p>}

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => saveEdit(trade.id)}
                            className="flex-1 py-2 sm:py-1 rounded bg-primary/20 text-primary text-[10px] font-bold hover:bg-primary/30 transition-colors"
                          >
                            SAVE
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="px-4 py-2 sm:py-1 rounded bg-accent text-muted-foreground text-[10px] font-bold hover:text-foreground transition-colors"
                          >
                            CANCEL
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug">
                          Leave a field empty to remove that level.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-border pt-3 flex justify-between items-center">
        <span className="text-muted-foreground text-sm font-semibold">Total Floating PnL</span>
        <motion.span
          key={Math.floor(animatedFloatingPnL)}
          initial={{ scale: 1.02 }}
          animate={{ scale: 1 }}
          className={`text-lg font-bold ${
            isPositive ? "text-profit glow-profit" : "text-loss glow-loss"
          }`}
        >
          {formatSignedCurrency(animatedFloatingPnL)}
        </motion.span>
      </div>
    </div>
  );
}
