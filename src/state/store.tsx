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

export const USERS_DATA: Record<string, { user: UserData; balance: number; pnl: number; equity: number; trades: Trade[]; initialDepositDate?: string; initialDepositAmount?: number }> = {
  "140830": {
    user: {
      name: "KETANKUMAR BAGLE",
      email: "ketankumarbagle@gmail.com",
      phone: "+91 9922XXXXXX",
    },
    balance: 3000,
    pnl: 7500,
    equity: 10500,
    initialDepositAmount: 3000,
    initialDepositDate: "2026-07-01T00:00:00Z",
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.2,
        entryPrice: 4031.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.05,
        entryPrice: 4013.41,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      }
    ]
  },
  "250912": {
    user: {
      name: "HITESH",
      email: "hitesh1408@gmail.com",
      phone: "+91 7744XXXXXX",
    },
    balance: 3000,
    pnl: 7500,
    equity: 10500,
    initialDepositAmount: 3000,
    initialDepositDate: "2026-07-01T00:00:00Z",
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.2,
        entryPrice: 4031.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.05,
        entryPrice: 4013.41,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      }
    ]
  }
};

const INITIAL_PRICE = 4056.27;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [activeUserId, setActiveUserId] = useState<string>("140830");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const currentUserData = USERS_DATA[activeUserId];

  const [balance, setBalance] = useState(currentUserData.balance);
  const balanceRef = useRef(currentUserData.balance);
  const [floatingPnL, setFloatingPnL] = useState(currentUserData.pnl);
  const [equity, setEquity] = useState(currentUserData.equity ?? currentUserData.balance + currentUserData.pnl);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: crypto.randomUUID(),
      type: "DEPOSIT",
      amount: currentUserData.initialDepositAmount ?? currentUserData.balance,
      date: currentUserData.initialDepositDate ?? new Date("2026-07-01T00:00:00Z").toISOString(),
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
      setEquity(data.equity ?? data.balance + data.pnl);
      setTrades(data.trades);
      setTransactions([
        {
          id: crypto.randomUUID(),
          type: "DEPOSIT",
          amount: data.initialDepositAmount ?? data.balance,
          date: data.initialDepositDate ?? new Date("2026-07-01T00:00:00Z").toISOString(),
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
