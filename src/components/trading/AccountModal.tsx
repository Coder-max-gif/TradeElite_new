import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/state/store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AccountModal({ open, onClose }: Props) {
  const { user, balance, equity, floatingPnL, transactions, deposit, withdraw } = useStore();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    deposit(amt);
    setDepositAmount("");
    showSuccess(`$${amt.toLocaleString()} deposited successfully`);
  };

  const handleWithdraw = () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return;
    if (amt > balance) {
      setWithdrawError("Insufficient balance");
      return;
    }
    withdraw(amt);
    setWithdrawAmount("");
    setWithdrawError("");
    showSuccess(`$${amt.toLocaleString()} withdrawn successfully`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel rounded-2xl w-full max-w-lg mx-4 p-6 glow-border-gold max-h-[85vh] overflow-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-primary">Account</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
            </div>

            {/* Balance summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center p-3 rounded-lg bg-accent/30">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-sm font-bold text-foreground">${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-accent/30">
                <p className="text-xs text-muted-foreground">Floating P/L</p>
                <p className={`text-sm font-bold ${floatingPnL >= 0 ? 'text-profit glow-profit' : 'text-loss glow-loss'}`}>
                  {floatingPnL >= 0 ? "+" : "-"}${Math.abs(floatingPnL).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-accent/30">
                <p className="text-xs text-muted-foreground">Equity</p>
                <motion.p
                  className="text-sm font-bold text-primary glow-gold"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ${equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </motion.p>
              </div>
            </div>

            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 rounded-lg bg-profit/10 border border-profit/30 text-profit text-sm font-medium text-center"
                >
                  ✓ {successMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <Tabs defaultValue="personal">
              <TabsList className="w-full bg-accent/30">
                <TabsTrigger value="personal" className="flex-1 text-xs">Personal Data</TabsTrigger>
                <TabsTrigger value="deposit" className="flex-1 text-xs">Deposit & Withdraw</TabsTrigger>
                <TabsTrigger value="history" className="flex-1 text-xs">Transactions</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-4 space-y-3">
                <Field label="Name" value={user.name} />
                <Field label="Email" value={user.email} />
                <Field label="Phone" value={user.phone} />
              </TabsContent>

              <TabsContent value="deposit" className="mt-4 space-y-5">
                {/* Deposit */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-primary uppercase tracking-wider">Deposit Funds</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDeposit}
                      className="px-5 py-2 rounded-lg bg-profit text-profit-foreground font-bold text-sm"
                    >
                      Deposit
                    </motion.button>
                  </div>
                </div>

                {/* Withdraw */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-primary uppercase tracking-wider">Withdraw Funds</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawAmount}
                      onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawError(""); }}
                      className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleWithdraw}
                      className="px-5 py-2 rounded-lg bg-loss text-loss-foreground font-bold text-sm"
                    >
                      Withdraw
                    </motion.button>
                  </div>
                  {withdrawError && <p className="text-xs text-loss">{withdrawError}</p>}
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
                ) : (
                  <div className="space-y-1 max-h-60 overflow-auto scrollbar-thin">
                    <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground px-3 py-2">
                      <span>Date</span><span>Type</span><span className="text-right">Amount</span><span className="text-right">Status</span>
                    </div>
                    {transactions.map((tx) => (
                      <div key={tx.id} className="grid grid-cols-4 gap-2 text-sm px-3 py-2 rounded-lg bg-accent/20">
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        <span className={`text-xs font-bold ${tx.type === "DEPOSIT" ? "text-profit" : "text-loss"}`}>{tx.type}</span>
                        <span className="text-right font-mono text-foreground">${tx.amount.toLocaleString()}</span>
                        <span className="text-right text-xs text-profit">{tx.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-accent/20">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
