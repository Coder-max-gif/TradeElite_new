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
  isAuthenticated: boolean;
  login: (userId: string) => void;
  logout: () => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => boolean;
  setCurrentPrice: (price: number) => void;
  setFloatingPnL: (pnl: number) => void;
  setTrades: (trades: Trade[]) => void;
}

const StoreContext = createContext<StoreState | null>(null);

const USERS_DATA: Record<string, { user: UserData; balance: number; pnl: number; trades: Trade[]; initialDepositDate?: string; initialDepositAmount?: number }> = {
  "140830": {
    user: {
      name: "KETANKUMAR BAGLE",
      email: "ketankumarbagle@gmail.com",
      phone: "+91 9922XXXXXX",
    },
    balance: 500000,
    pnl: 120000,
    initialDepositAmount: 50000,
    initialDepositDate: "2023-05-05T00:00:00Z",
    trades: [
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
    ]
  },
  "250912": {
    user: {
      name: "HITESH",
      email: "hitesh1408@gmail.com",
      phone: "+91 7744XXXXXX",
    },
    balance: 500000,
    pnl: 65000,
    initialDepositAmount: 50000,
    initialDepositDate: "2023-05-05T00:00:00Z",
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 2350,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.2,
        entryPrice: 2380,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      }
    ]
  }
};

const INITIAL_PRICE = 4731.0;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [activeUserId, setActiveUserId] = useState<string>("140830");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const currentUserData = USERS_DATA[activeUserId];

  const [balance, setBalance] = useState(currentUserData.balance);
  const balanceRef = useRef(currentUserData.balance);
  const [floatingPnL, setFloatingPnL] = useState(currentUserData.pnl);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: crypto.randomUUID(),
      type: "DEPOSIT",
      amount: currentUserData.initialDepositAmount ?? currentUserData.balance,
      date: currentUserData.initialDepositDate ?? new Date("2026-03-09T00:00:00Z").toISOString(),
      status: "Completed",
    }
  ]);
  const [currentPrice, setCurrentPrice] = useState(INITIAL_PRICE);
  const [trades, setTrades] = useState<Trade[]>(currentUserData.trades);

  const login = useCallback((userId: string) => {
    const data = USERS_DATA[userId];
    if (data) {
      setActiveUserId(userId);
      setIsAuthenticated(true);
      setBalance(data.balance);
      balanceRef.current = data.balance;
      setFloatingPnL(data.pnl);
      setTrades(data.trades);
      setTransactions([
        {
          id: crypto.randomUUID(),
          type: "DEPOSIT",
          amount: data.initialDepositAmount ?? data.balance,
          date: data.initialDepositDate ?? new Date().toISOString(),
          status: "Completed",
        }
      ]);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  const user = currentUserData.user;

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
        isAuthenticated,
        login,
        logout,
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
