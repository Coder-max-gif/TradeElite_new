import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/state/store";
import { AccountModal } from "@/components/trading/AccountModal";
import { Link, useLocation } from "@tanstack/react-router";

export function Navbar() {
  const { balance, floatingPnL, equity } = useStore();
  const [showAccount, setShowAccount] = useState(false);
  const location = useLocation();
  
  const isAccountPage = location.pathname === "/account";

  return (
    <>
      <nav className="glass-panel border-b border-border px-6 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">FX</span>
          </div>
          <span className="text-foreground font-semibold text-lg tracking-tight">TradeElite</span>
          {!isAccountPage && (
            <span className="ml-4 flex items-center gap-1.5 text-xs font-medium text-profit">
              <span className="w-2 h-2 rounded-full bg-profit animate-pulse-slow" />
              LIVE TRADING
            </span>
          )}
        </Link>

        {!isAccountPage && (
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-sm font-bold text-foreground">${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Equity</p>
              <p className="text-sm font-bold text-primary glow-gold">${equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Floating P/L</p>
              <motion.p
                className="text-sm font-bold text-profit glow-profit"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                +${floatingPnL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </motion.p>
            </div>
            <Link to="/account">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
              >
                Account
              </motion.button>
            </Link>
          </div>
        )}
      </nav>
      <AccountModal open={showAccount} onClose={() => setShowAccount(false)} />
    </>
  );
}
