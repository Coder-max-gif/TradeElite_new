import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/state/store";
import { getSpec, askPrice, bidPrice, symbolStatus, LOT_STEP, MIN_LOT } from "@/lib/symbols";
import { calculateMargin } from "@/utils/pnlCalculator";
import { LEVERAGE } from "@/state/store";
import { formatCurrency } from "@/utils/format";

interface Props {
  symbol: string;
}

export function OrderPanel({ symbol }: Props) {
  const { openTrade, priceOf, freeMargin, slippageEstimate, now } = useStore();
  const spec = getSpec(symbol);
  const session = symbolStatus(spec.id, new Date(now));

  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [lotSize, setLotSize] = useState("0.10");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const mid = priceOf(spec.id);
  const ask = askPrice(spec.id, mid);
  const bid = bidPrice(spec.id, mid);
  const fillPrice = orderType === "BUY" ? ask : bid;

  const lot = Number(lotSize);
  const canTrade = session.open && Number.isFinite(lot) && lot > 0;
  const validLot = Number.isFinite(lot) && lot > 0;
  const requiredMargin = validLot ? calculateMargin(spec.id, lot, fillPrice, LEVERAGE) : 0;
  // Typical slippage for this size on the current tape; the actual fill is a
  // random draw around it.
  const slippage = validLot ? slippageEstimate(spec.id, lot) : 0;
  const notional = validLot ? lot * spec.contractSize * fillPrice : 0;

  const stepLot = (delta: number) => {
    const next = Math.max(MIN_LOT, (Number(lotSize) || 0) + delta);
    setLotSize(next.toFixed(2));
  };

  /** Blank stop fields mean "no stop", which is different from 0. */
  const parseLevel = (raw: string): number | undefined => {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };

  const handleExecute = () => {
    const result = openTrade({
      symbol: spec.id,
      type: orderType,
      lot,
      sl: parseLevel(stopLoss),
      tp: parseLevel(takeProfit),
    });

    if (result.ok) {
      setFeedback({
        ok: true,
        message: `${orderType} ${lot.toFixed(2)} ${spec.display} @ ${result.trade.entryPrice.toFixed(spec.digits)}`,
      });
      setStopLoss("");
      setTakeProfit("");
    } else {
      setFeedback({ ok: false, message: result.error });
    }

    setTimeout(() => setFeedback(null), 2600);
  };

  return (
    <div className="glass-panel rounded-xl p-4 glow-border-gold relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-primary uppercase tracking-widest">Order</h3>
        <span className="text-xs font-mono text-muted-foreground">{spec.display}</span>
      </div>

      {/* Live bid / ask — the two prices an order can actually fill at */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setOrderType("SELL")}
          className={`rounded-lg py-2 px-2 text-left transition-all ${
            orderType === "SELL"
              ? "bg-loss/15 border border-loss/40"
              : "bg-accent/40 border border-transparent hover:bg-accent/60"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sell / Bid</p>
          <p className="text-sm font-bold font-mono text-loss">{bid.toFixed(spec.digits)}</p>
        </button>
        <button
          onClick={() => setOrderType("BUY")}
          className={`rounded-lg py-2 px-2 text-right transition-all ${
            orderType === "BUY"
              ? "bg-profit/15 border border-profit/40"
              : "bg-accent/40 border border-transparent hover:bg-accent/60"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Buy / Ask</p>
          <p className="text-sm font-bold font-mono text-profit">{ask.toFixed(spec.digits)}</p>
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Lot Size</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => stepLot(-LOT_STEP)}
              className="w-8 h-9 rounded-lg bg-accent text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              −
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              className="flex-1 min-w-0 bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={() => stepLot(LOT_STEP)}
              className="w-8 h-9 rounded-lg bg-accent text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              +
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Stop Loss</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="none"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Take Profit</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="none"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-1 pt-1 text-[11px] text-muted-foreground">
          <div className="flex justify-between">
            <span>Position size</span>
            <span className="font-mono text-foreground">{formatCurrency(notional)}</span>
          </div>
          <div className="flex justify-between">
            <span>Margin at 1:{LEVERAGE}</span>
            <span
              className={`font-mono ${requiredMargin > freeMargin ? "text-loss" : "text-foreground"}`}
            >
              {formatCurrency(requiredMargin)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Est. slippage</span>
            <span className="font-mono text-foreground">
              ±{slippage.toFixed(spec.digits)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Free margin</span>
            <span className={`font-mono ${freeMargin < 0 ? "text-loss" : "text-foreground"}`}>
              {formatCurrency(freeMargin)}
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: canTrade ? 1.02 : 1 }}
          whileTap={{ scale: canTrade ? 0.98 : 1 }}
          onClick={handleExecute}
          disabled={!canTrade}
          className={`w-full py-3 rounded-lg text-sm font-bold transition-all mt-2 disabled:opacity-40 disabled:cursor-not-allowed ${
            orderType === "BUY"
              ? "bg-gradient-to-r from-profit to-emerald-400 text-profit-foreground shadow-lg shadow-profit/30"
              : "bg-gradient-to-r from-loss to-red-400 text-loss-foreground shadow-lg shadow-loss/30"
          }`}
        >
          {session.open
            ? `${orderType} ${validLot ? lot.toFixed(2) : "—"} @ ${fillPrice.toFixed(spec.digits)}`
            : "Market Closed"}
        </motion.button>

        {!session.open && (
          <p className="text-[11px] text-center text-muted-foreground pt-1">
            {spec.display} trades Monday to Friday. {session.label}.
          </p>
        )}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-xl p-4"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${
                  feedback.ok ? "bg-profit/20" : "bg-loss/20"
                }`}
              >
                {feedback.ok ? (
                  <svg
                    className="w-7 h-7 text-profit"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg
                    className="w-7 h-7 text-loss"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </motion.div>
              <p
                className={`text-sm font-bold ${feedback.ok ? "text-profit glow-profit" : "text-loss"}`}
              >
                {feedback.ok ? "Order Filled" : "Order Rejected"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{feedback.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
