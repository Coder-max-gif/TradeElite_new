import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/state/store";
import { useAnimatedValue } from "@/hooks/useAnimatedValue";
import { AccountModal } from "@/components/trading/AccountModal";
import { formatCurrency, formatSignedCurrency } from "@/utils/format";
import { Link, useLocation } from "@tanstack/react-router";
import { UserRound } from "lucide-react";

export function Navbar() {
  const { balance, floatingPnL, equity } = useStore();
  const animatedEquity = useAnimatedValue(equity, 4);
  const animatedFloatingPnL = useAnimatedValue(floatingPnL, 4);
  const [showAccount, setShowAccount] = useState(false);
  const location = useLocation();
  
  const isAccountPage = location.pathname === "/account";

  return (
    <>
      <nav className="glass-panel border-b border-border px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 pt-safe px-safe">
        <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3 min-h-11 sm:min-h-0 hover:opacity-80 transition-opacity cursor-pointer min-w-0 shrink">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">FX</span>
          </div>
          <span className="text-foreground font-semibold text-base sm:text-lg tracking-tight truncate">TradeElite</span>
          {!isAccountPage && (
            <span className="ml-2 lg:ml-4 hidden sm:flex items-center gap-1.5 text-xs font-medium text-profit">
              <span className="w-2 h-2 rounded-full bg-profit animate-pulse-slow" />
              LIVE TRADING
            </span>
          )}
        </Link>

        {!isAccountPage && (
          <div className="flex items-center gap-3 sm:gap-5 lg:gap-8 min-w-0">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Balance</p>
              <p className="text-xs sm:text-sm font-bold text-foreground tabular-nums">{formatCurrency(balance)}</p>
            </div>
            <div className="text-right min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Equity</p>
              <motion.p
                className="text-xs sm:text-sm font-bold text-primary glow-gold tabular-nums"
                animate={{ opacity: [0.9, 1, 0.9] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatType: "mirror" }}
              >
                {formatCurrency(animatedEquity)}
              </motion.p>
            </div>
            <div className="text-right min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                <span className="sm:hidden">P/L</span>
                <span className="hidden sm:inline">Floating P/L</span>
              </p>
              <motion.p
                className={`text-xs sm:text-sm font-bold tabular-nums ${animatedFloatingPnL >= 0 ? 'text-profit glow-profit' : 'text-loss glow-loss'}`}
                animate={{ opacity: [0.9, 1, 0.9] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatType: "mirror" }}
              >
                {formatSignedCurrency(animatedFloatingPnL)}
              </motion.p>
            </div>
            <Link to="/account">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Account"
                className="shrink-0 grid place-items-center h-11 w-11 sm:h-auto sm:w-auto sm:px-4 sm:py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
              >
                <UserRound className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">Account</span>
              </motion.button>
            </Link>
          </div>
        )}
      </nav>
      <AccountModal open={showAccount} onClose={() => setShowAccount(false)} />
    </>
  );
}
