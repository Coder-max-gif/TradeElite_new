import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function OrderPanel() {
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [lotSize, setLotSize] = useState("1.00");
  const [stopLoss, setStopLoss] = useState("2340.00");
  const [takeProfit, setTakeProfit] = useState("2380.00");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleExecute = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  return (
    <div className="glass-panel rounded-xl p-4 glow-border-gold relative overflow-hidden">
      <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">Order</h3>

      {/* Buy/Sell toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOrderType("buy")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            orderType === "buy"
              ? "bg-profit text-profit-foreground shadow-lg shadow-profit/20"
              : "bg-accent text-muted-foreground hover:text-foreground"
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderType("sell")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            orderType === "sell"
              ? "bg-loss text-loss-foreground shadow-lg shadow-loss/20"
              : "bg-accent text-muted-foreground hover:text-foreground"
          }`}
        >
          SELL
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Lot Size</label>
          <input
            type="text"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Stop Loss</label>
          <input
            type="text"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Take Profit</label>
          <input
            type="text"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExecute}
          className={`w-full py-3 rounded-lg text-sm font-bold transition-all mt-2 ${
            orderType === "buy"
              ? "bg-gradient-to-r from-profit to-emerald-400 text-profit-foreground shadow-lg shadow-profit/30"
              : "bg-gradient-to-r from-loss to-red-400 text-loss-foreground shadow-lg shadow-loss/30"
          }`}
        >
          Execute Trade
        </motion.button>
      </div>

      {/* Success popup */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-xl"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-14 h-14 mx-auto mb-3 rounded-full bg-profit/20 flex items-center justify-center"
              >
                <svg className="w-7 h-7 text-profit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <p className="text-sm font-bold text-profit glow-profit">Trade Executed Successfully</p>
              <p className="text-xs text-muted-foreground mt-1">Order confirmed</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
