import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import type { Transaction, ActiveTradeData, UserData } from "./store.types";

export type { Transaction, ActiveTradeData, UserData };

interface StoreState {
  balance: number;
  floatingPnL: number;
  equity: number;
  transactions: Transaction[];
  user: UserData;
  currentPrice: number;
  activeTrade: ActiveTradeData;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => boolean;
  setCurrentPrice: (price: number) => void;
  setFloatingPnL: (pnl: number) => void;
  setActiveTrade: (trade: ActiveTradeData) => void;
}

const StoreContext = createContext<StoreState | null>(null);

const INITIAL_BALANCE = 350000;
const INITIAL_PNL = 150000;
const LOT_SIZE = 50;
const MULTIPLIER = 100;
const INITIAL_PRICE = 2360.0;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const balanceRef = useRef(INITIAL_BALANCE);
  const [floatingPnL, setFloatingPnL] = useState(INITIAL_PNL);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: crypto.randomUUID(),
      type: "DEPOSIT",
      amount: 350000,
      date: new Date().toISOString(),
      status: "Completed",
    }
  ]);
  const [currentPrice, setCurrentPrice] = useState(INITIAL_PRICE);
  
  // Locked trade state after initialization
  const [activeTrade, setActiveTrade] = useState<ActiveTradeData>(() => {
    // We want the profit to start at exactly $150,000.
    // By setting entryPrice = INITIAL_PRICE, the initial price movement is $0.
    // The calculatePnL function adds the $150,000 base to this.
    const startPrice = INITIAL_PRICE;
    return {
      asset: "OANDA:XAUUSD",
      direction: "BUY",
      lotSize: LOT_SIZE,
      multiplier: MULTIPLIER,
      entryPrice: startPrice,
      currentPrice: startPrice,
      profit: INITIAL_PNL,
    };
  });

  const user: UserData = {
    name: "Krishna Bagale",
    email: "baglekrishna7@gmail.com",
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

  const setActiveTradeWrapper = useCallback((trade: ActiveTradeData) => {
    setActiveTrade(trade);
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
        activeTrade,
        deposit,
        withdraw,
        setCurrentPrice: setCurrentPriceWrapper,
        setFloatingPnL: setFloatingPnLWrapper,
        setActiveTrade: setActiveTradeWrapper,
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
