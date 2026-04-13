import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import type { Transaction, Trade, UserData } from "./store.types";

export type { Transaction, Trade, UserData };

interface StoreState {
  balance: number;
  floatingPnL: number;
  equity: number;
  transactions: Transaction[];
  user: UserData;
  currentPrice: number;
  trades: Trade[];
  deposit: (amount: number) => void;
  withdraw: (amount: number) => boolean;
  setCurrentPrice: (price: number) => void;
  setFloatingPnL: (pnl: number) => void;
  setTrades: (trades: Trade[]) => void;
}

const StoreContext = createContext<StoreState | null>(null);

const INITIAL_BALANCE = 420000;
const INITIAL_PNL = 120000;
const INITIAL_PRICE = 4731.0;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const balanceRef = useRef(INITIAL_BALANCE);
  const [floatingPnL, setFloatingPnL] = useState(INITIAL_PNL);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: crypto.randomUUID(),
      type: "DEPOSIT",
      amount: 420000,
      date: new Date("2026-03-09T00:00:00Z").toISOString(),
      status: "Completed",
    }
  ]);
  const [currentPrice, setCurrentPrice] = useState(INITIAL_PRICE);
  
  const [trades, setTrades] = useState<Trade[]>([
    {
      id: crypto.randomUUID(),
      type: "SELL",
      lot: 4.5,
      entryPrice: 5137,
      symbol: "XAUUSD",
      openDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      type: "SELL",
      lot: 1.5,
      entryPrice: 5078,
      symbol: "XAUUSD",
      openDate: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      type: "SELL",
      lot: 1,
      entryPrice: 4637,
      symbol: "XAUUSD",
      openDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      type: "SELL",
      lot: 12,
      entryPrice: 4195,
      symbol: "XAUUSD",
      openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: crypto.randomUUID(),
      type: "BUY",
      lot: 17.1,
      entryPrice: 4417,
      symbol: "XAUUSD",
      openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    }
  ]);

  const user: UserData = {
    name: "KETANKUMAR BAGLE",
    email: "ketankumarbagle@gmail.com",
    phone: "+91 9922XXXXXX",
  };

  const deposit = useCallback((amount: number) => {
    setBalance((b) => {
      const next = b + amount;
      balanceRef.current = next;
      return next;
    });
    setTransactions((t) => [
      {
        id: crypto.randomUUID(),
        type: "DEPOSIT",
        amount,
        date: new Date().toISOString(),
        status: "Completed",
      },
      ...t,
    ]);
  }, []);

  const withdraw = useCallback((amount: number): boolean => {
    if (amount > balanceRef.current) return false;

    setBalance((b) => {
      const next = b - amount;
      balanceRef.current = next;
      return next;
    });

    setTransactions((t) => [
      {
        id: crypto.randomUUID(),
        type: "WITHDRAW",
        amount,
        date: new Date().toISOString(),
        status: "Completed",
      },
      ...t,
    ]);
    return true;
  }, []);

  const setCurrentPriceWrapper = useCallback((price: number) => {
    setCurrentPrice(price);
  }, []);

  const setFloatingPnLWrapper = useCallback((pnl: number) => {
    setFloatingPnL(pnl);
  }, []);

  const setTradesWrapper = useCallback((newTrades: Trade[]) => {
    setTrades(newTrades);
  }, []);

  const equity = balance + floatingPnL;

  return (
    <StoreContext.Provider
      value={{
        balance,
        floatingPnL,
        equity,
        transactions,
        user,
        currentPrice,
        trades,
        deposit,
        withdraw,
        setCurrentPrice: setCurrentPriceWrapper,
        setFloatingPnL: setFloatingPnLWrapper,
        setTrades: setTradesWrapper,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
