import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore } from "@/state/store";
import { useAnimatedValue } from "@/hooks/useAnimatedValue";
import { formatCurrency, formatDate } from "@/utils/format";
import { Navbar } from "@/components/trading/Navbar";
import { motion } from "framer-motion";
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Wallet, 
  History, 
  ArrowLeft,
  ChevronRight,
  Clock,
  CheckCircle2
} from "lucide-react";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user, balance, equity, transactions, isAuthenticated } = useStore();
  const animatedEquity = useAnimatedValue(equity, 4);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      
      <main className="flex-1 overflow-auto touch-scroll scrollbar-thin p-4 sm:p-6 pb-safe px-safe">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-5 sm:mb-8">
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-profit/10 text-profit text-xs font-bold border border-profit/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                VERIFIED ACCOUNT
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* User Profile Card */}
            <div className="md:col-span-1 space-y-4 sm:space-y-6">
              <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center space-y-4 glow-border-gold">
                <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center relative group overflow-hidden">
                  <User className="w-12 h-12 text-primary" />
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <span className="text-[10px] font-bold text-primary-foreground">EDIT</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                  <p className="text-xs text-muted-foreground mt-1">Professional Trader</p>
                </div>
                <div className="w-full pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 text-primary/60" />
                    <span className="truncate min-w-0">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 text-primary/60" />
                    <span>{user.phone}</span>
                  </div>
                </div>
              </div>

              {/* Security Status */}
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Security Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Two-Factor Auth</span>
                    <span className="text-profit font-medium">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Identity Verified</span>
                    <span className="text-profit font-medium">Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Info & Transactions */}
            <div className="md:col-span-2 space-y-4 sm:space-y-6">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-panel p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Current Balance</span>
                    <Wallet className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{formatCurrency(balance)}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl bg-gradient-to-br from-profit/5 to-transparent border-profit/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Total Equity</span>
                    <ShieldCheck className="w-4 h-4 text-profit" />
                  </div>
                  <motion.p
                    className="text-xl sm:text-2xl font-bold text-foreground tabular-nums"
                    animate={{ opacity: [0.9, 1, 0.9] }}
                    transition={{ duration: 2.2, repeat: Infinity, repeatType: "mirror" }}
                  >
                    {formatCurrency(animatedEquity)}
                  </motion.p>
                </div>
              </div>

              {/* Transaction History */}
              <div className="glass-panel rounded-2xl overflow-hidden border-border/50">
                <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    Transaction History
                  </h3>
                  <button className="text-xs text-primary hover:underline font-medium">View All</button>
                </div>
                <div className="divide-y divide-border overflow-hidden">
                  {transactions.length > 0 ? (
                    transactions.map((tx, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={tx.id} 
                        className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                            tx.type === 'DEPOSIT' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                          }`}>
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{tx.type}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDate(tx.date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <p className={`text-sm font-bold tabular-nums ${
                            tx.type === 'DEPOSIT' ? 'text-profit' : 'text-loss'
                          }`}>
                            {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase">{tx.status}</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <History className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm">No transactions yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Settings Shortcut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Security Settings', 'Billing Details'].map((item) => (
                  <button
                    key={item}
                    className="flex items-center justify-between p-4 glass-panel rounded-xl hover:bg-muted/50 transition-all group"
                  >
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{item}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </button>
                ))}
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
