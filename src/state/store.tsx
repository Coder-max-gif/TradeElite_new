import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Transaction, Trade, ClosedTrade, UserData, CloseReason, PersistedAccount } from "./store.types";
import { calculateTotalPnL, calculateClosedProfit, calculateTradePnL, calculateMargin } from "@/utils/pnlCalculator";
import { subscribeToPrice, allSymbols, getPrice, volatilityMultiplier, XAUUSD_BASE_PRICE } from "@/services/priceService";
import { fillMarketOrder, fillCloseOrder, expectedSlippage } from "@/lib/execution";
import {
  getSpec, askPrice, bidPrice, isSymbolOpen, normalizeLot, MIN_LOT, DEFAULT_SYMBOL,
} from "@/lib/symbols";

export type { Transaction, Trade, ClosedTrade, UserData, CloseReason };

/** Account leverage, as an MT5 1:N ratio. */
export const LEVERAGE = 100;
/** Margin level at which the broker starts force-closing positions. */
export const STOP_OUT_LEVEL = 50;
/** Margin level below which the account is flagged as being on margin call. */
export const MARGIN_CALL_LEVEL = 100;

export interface OrderRequest {
  symbol: string;
  type: "BUY" | "SELL";
  lot: number;
  sl?: number;
  tp?: number;
}

export type OrderResult =
  | { ok: true; trade: Trade; slippage: number }
  | { ok: false; error: string };

/** Outcome of amending the stop or target on a position already open. */
export type ModifyResult = { ok: true } | { ok: false; error: string };

/**
 * A stop or target amendment. Omitting a key leaves that level alone; passing
 * null removes it. Without the null case there is no way to express "clear the
 * stop", since undefined already means "don't touch it".
 */
export interface ModifyRequest {
  sl?: number | null;
  tp?: number | null;
}

interface StoreState {
  balance: number;
  floatingPnL: number;
  equity: number;
  closedProfit: number;
  /** Margin currently held by open positions, and what is left to trade with. */
  usedMargin: number;
  freeMargin: number;
  /** Equity / margin as a percentage; Infinity when no position is open. */
  marginLevel: number;
  /** True once margin level falls under MARGIN_CALL_LEVEL. */
  marginCall: boolean;
  /** Most a withdrawal may take out without breaching margin. */
  withdrawable: number;
  /** Typical slippage for a market order of this size, in price units. */
  slippageEstimate: (symbol: string, lot: number) => number;
  transactions: Transaction[];
  user: UserData;
  /** Gold's mid price. Retained for widgets that predate multi-symbol support. */
  currentPrice: number;
  /** Live mid price per symbol id. */
  prices: Record<string, number>;
  priceOf: (symbol: string) => number;
  /**
   * Coarse clock that advances while the app is open. Components read it so
   * session badges and countdowns re-render as the market opens and closes.
   */
  now: number;
  trades: Trade[];
  closedTrades: ClosedTrade[];
  isAuthenticated: boolean;
  login: (userId: string) => void;
  logout: () => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => boolean;
  setTrades: (trades: Trade[]) => void;
  openTrade: (order: OrderRequest) => OrderResult;
  closeTrade: (id: string, reason?: CloseReason) => void;
  closeAllTrades: () => void;
  /** Amend the stop or target on an open position. */
  modifyTrade: (id: string, changes: ModifyRequest) => ModifyResult;
  /** Wipe saved progress and restore the account's seeded book. */
  resetAccount: () => void;
}

const StoreContext = createContext<StoreState | null>(null);

export const USERS_DATA: Record<string, { user: UserData; balance: number; pnl: number; equity: number; trades: Trade[]; closedTrades?: ClosedTrade[]; transactions?: Transaction[]; initialDepositDate?: string; initialDepositAmount?: number }> = {
  "140830": {
    user: {
      name: "KETANKUMAR BAGLE",
      email: "ketankumarbagle@gmail.com",
      phone: "+91 9922XXXXXX",
    },
    balance: 250000,
    pnl: 15000,
    equity: 1668000,
    initialDepositAmount: 250000,
    initialDepositDate: "2026-01-09T00:00:00Z",
    transactions: [
      {
        id: crypto.randomUUID(),
        type: "DEPOSIT",
        amount: 3000,
        date: "2026-07-01T00:00:00Z",
        status: "Completed",
      },
      {
        id: crypto.randomUUID(),
        type: "DEPOSIT",
        amount: 250000,
        date: "2026-01-09T00:00:00Z",
        status: "Completed",
      }
    ],
    closedTrades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 5.0,
        entryPrice: 3465.80,
        exitPrice: 3492.30,
        symbol: "XAUUSD",
        openDate: "2026-01-12T08:30:00Z",
        closeDate: "2026-01-14T14:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 6.0,
        entryPrice: 3478.40,
        exitPrice: 3506.65,
        symbol: "XAUUSD",
        openDate: "2026-01-15T09:15:00Z",
        closeDate: "2026-01-20T13:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 4.0,
        entryPrice: 3512.90,
        exitPrice: 3495.40,
        symbol: "XAUUSD",
        openDate: "2026-01-21T10:05:00Z",
        closeDate: "2026-01-22T16:35:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 5.5,
        entryPrice: 3499.60,
        exitPrice: 3486.10,
        symbol: "XAUUSD",
        openDate: "2026-01-23T07:45:00Z",
        closeDate: "2026-01-23T15:10:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 7.0,
        entryPrice: 3491.20,
        exitPrice: 3519.45,
        symbol: "XAUUSD",
        openDate: "2026-01-26T08:20:00Z",
        closeDate: "2026-01-28T16:30:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 5.0,
        entryPrice: 3513.60,
        exitPrice: 3534.50,
        symbol: "XAUUSD",
        openDate: "2026-01-29T09:40:00Z",
        closeDate: "2026-01-30T14:55:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 7.0,
        entryPrice: 3544.90,
        exitPrice: 3576.40,
        symbol: "XAUUSD",
        openDate: "2026-02-02T07:55:00Z",
        closeDate: "2026-02-05T12:45:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 5.0,
        entryPrice: 3581.70,
        exitPrice: 3562.20,
        symbol: "XAUUSD",
        openDate: "2026-02-09T10:15:00Z",
        closeDate: "2026-02-10T15:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 8.0,
        entryPrice: 3567.30,
        exitPrice: 3552.05,
        symbol: "XAUUSD",
        openDate: "2026-02-11T08:10:00Z",
        closeDate: "2026-02-12T14:50:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 9.0,
        entryPrice: 3558.80,
        exitPrice: 3593.55,
        symbol: "XAUUSD",
        openDate: "2026-02-16T09:25:00Z",
        closeDate: "2026-02-20T13:15:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 8.0,
        entryPrice: 3584.20,
        exitPrice: 3614.90,
        symbol: "XAUUSD",
        openDate: "2026-02-23T08:35:00Z",
        closeDate: "2026-02-26T15:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 7.0,
        entryPrice: 3621.50,
        exitPrice: 3593.55,
        symbol: "XAUUSD",
        openDate: "2026-02-26T10:50:00Z",
        closeDate: "2026-02-27T12:25:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 10.0,
        entryPrice: 3626.40,
        exitPrice: 3657.90,
        symbol: "XAUUSD",
        openDate: "2026-03-02T09:05:00Z",
        closeDate: "2026-03-05T16:45:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 9.0,
        entryPrice: 3644.70,
        exitPrice: 3630.20,
        symbol: "XAUUSD",
        openDate: "2026-03-09T07:50:00Z",
        closeDate: "2026-03-10T14:30:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 8.0,
        entryPrice: 3671.90,
        exitPrice: 3648.65,
        symbol: "XAUUSD",
        openDate: "2026-03-11T08:45:00Z",
        closeDate: "2026-03-13T11:55:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 12.0,
        entryPrice: 3652.30,
        exitPrice: 3684.80,
        symbol: "XAUUSD",
        openDate: "2026-03-16T09:10:00Z",
        closeDate: "2026-03-20T15:25:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 11.0,
        entryPrice: 3661.50,
        exitPrice: 3689.25,
        symbol: "XAUUSD",
        openDate: "2026-03-23T08:25:00Z",
        closeDate: "2026-03-27T14:10:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 5.0,
        entryPrice: 3649.90,
        exitPrice: 3686.75,
        symbol: "XAUUSD",
        openDate: "2026-03-30T10:35:00Z",
        closeDate: "2026-03-31T13:50:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 13.0,
        entryPrice: 3699.80,
        exitPrice: 3733.55,
        symbol: "XAUUSD",
        openDate: "2026-04-01T07:40:00Z",
        closeDate: "2026-04-06T16:15:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 9.0,
        entryPrice: 3745.20,
        exitPrice: 3768.45,
        symbol: "XAUUSD",
        openDate: "2026-04-08T09:20:00Z",
        closeDate: "2026-04-09T12:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 15.0,
        entryPrice: 3738.60,
        exitPrice: 3775.35,
        symbol: "XAUUSD",
        openDate: "2026-04-13T08:15:00Z",
        closeDate: "2026-04-17T11:30:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 10.0,
        entryPrice: 3782.90,
        exitPrice: 3759.15,
        symbol: "XAUUSD",
        openDate: "2026-04-20T13:45:00Z",
        closeDate: "2026-04-22T17:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 14.0,
        entryPrice: 3752.40,
        exitPrice: 3787.65,
        symbol: "XAUUSD",
        openDate: "2026-04-23T08:50:00Z",
        closeDate: "2026-04-28T14:35:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 7.0,
        entryPrice: 3776.80,
        exitPrice: 3796.55,
        symbol: "XAUUSD",
        openDate: "2026-04-29T09:30:00Z",
        closeDate: "2026-04-30T16:50:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 18.0,
        entryPrice: 3804.60,
        exitPrice: 3833.35,
        symbol: "XAUUSD",
        openDate: "2026-05-04T07:35:00Z",
        closeDate: "2026-05-07T15:05:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 14.0,
        entryPrice: 3840.20,
        exitPrice: 3818.95,
        symbol: "XAUUSD",
        openDate: "2026-05-08T08:15:00Z",
        closeDate: "2026-05-12T12:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 16.0,
        entryPrice: 3824.70,
        exitPrice: 3807.20,
        symbol: "XAUUSD",
        openDate: "2026-05-13T10:40:00Z",
        closeDate: "2026-05-14T14:55:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 20.0,
        entryPrice: 3810.90,
        exitPrice: 3843.65,
        symbol: "XAUUSD",
        openDate: "2026-05-15T08:05:00Z",
        closeDate: "2026-05-21T16:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 19.0,
        entryPrice: 3819.40,
        exitPrice: 3847.15,
        symbol: "XAUUSD",
        openDate: "2026-05-22T09:00:00Z",
        closeDate: "2026-05-27T14:00:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 15.0,
        entryPrice: 3815.30,
        exitPrice: 3844.15,
        symbol: "XAUUSD",
        openDate: "2026-05-28T15:20:00Z",
        closeDate: "2026-05-29T12:10:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 24.0,
        entryPrice: 3857.90,
        exitPrice: 3894.40,
        symbol: "XAUUSD",
        openDate: "2026-06-01T13:25:00Z",
        closeDate: "2026-06-05T18:30:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 18.0,
        entryPrice: 3876.30,
        exitPrice: 3859.80,
        symbol: "XAUUSD",
        openDate: "2026-06-08T08:30:00Z",
        closeDate: "2026-06-09T14:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 16.0,
        entryPrice: 3908.40,
        exitPrice: 3880.15,
        symbol: "XAUUSD",
        openDate: "2026-06-10T09:15:00Z",
        closeDate: "2026-06-12T13:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 26.0,
        entryPrice: 3886.70,
        exitPrice: 3925.20,
        symbol: "XAUUSD",
        openDate: "2026-06-15T10:05:00Z",
        closeDate: "2026-06-19T16:35:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 15.0,
        entryPrice: 3948.90,
        exitPrice: 3927.40,
        symbol: "XAUUSD",
        openDate: "2026-06-22T07:45:00Z",
        closeDate: "2026-06-24T15:10:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 18.0,
        entryPrice: 3921.60,
        exitPrice: 3946.35,
        symbol: "XAUUSD",
        openDate: "2026-06-25T08:20:00Z",
        closeDate: "2026-06-30T16:30:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 28.0,
        entryPrice: 3968.90,
        exitPrice: 4003.65,
        symbol: "XAUUSD",
        openDate: "2026-07-01T09:40:00Z",
        closeDate: "2026-07-06T15:55:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 20.0,
        entryPrice: 4011.40,
        exitPrice: 4034.15,
        symbol: "XAUUSD",
        openDate: "2026-07-08T07:55:00Z",
        closeDate: "2026-07-09T12:45:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 32.0,
        entryPrice: 4000.70,
        exitPrice: 4042.20,
        symbol: "XAUUSD",
        openDate: "2026-07-13T10:15:00Z",
        closeDate: "2026-07-17T15:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 25.0,
        entryPrice: 4025.60,
        exitPrice: 4055.35,
        symbol: "XAUUSD",
        openDate: "2026-07-20T08:10:00Z",
        closeDate: "2026-07-24T14:50:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 18.0,
        entryPrice: 4052.80,
        exitPrice: 4019.55,
        symbol: "XAUUSD",
        openDate: "2026-07-27T09:25:00Z",
        closeDate: "2026-07-29T13:15:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 23.0,
        entryPrice: 4034.90,
        exitPrice: 4057.15,
        symbol: "XAUUSD",
        openDate: "2026-07-30T08:35:00Z",
        closeDate: "2026-07-31T15:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 25.0,
        entryPrice: 4042.30,
        exitPrice: 4068.55,
        symbol: "XAUUSD",
        openDate: "2026-08-01T09:00:00Z",
        closeDate: "2026-08-02T14:00:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 13.0,
        entryPrice: 4064.90,
        exitPrice: 4046.15,
        symbol: "XAUUSD",
        openDate: "2026-08-02T15:20:00Z",
        closeDate: "2026-08-03T12:10:00Z",
      }
    ],
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 4462.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 4470.09,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.5,
        entryPrice: 4471.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 2.0,
        entryPrice: 4500.09,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      }
    ]
  },
  "250912": {
    user: {
      name: "HITESH",
      email: "hitesh1408@gmail.com",
      phone: "+91 9467XXXXXX",
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
        entryPrice: 4462.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.05,
        entryPrice: 4444.73,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      }
    ]
  },
  "020726": {
    user: {
      name: "Vishal Panchal",
      email: "vishalpanchal@gmail.com",
      phone: "+91 9873XXXXXX",
    },
    balance: 50000,
    pnl: 12400,
    equity: 105000,
    initialDepositAmount: 50000,
    initialDepositDate: "2026-07-02T00:00:00Z",
    closedTrades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.5,
        entryPrice: 3948.40,
        exitPrice: 3972.60,
        symbol: "XAUUSD",
        openDate: "2026-07-03T08:15:00Z",
        closeDate: "2026-07-03T14:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 3965.10,
        exitPrice: 3990.35,
        symbol: "XAUUSD",
        openDate: "2026-07-07T09:30:00Z",
        closeDate: "2026-07-08T11:05:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.0,
        entryPrice: 3998.20,
        exitPrice: 3984.70,
        symbol: "XAUUSD",
        openDate: "2026-07-08T13:20:00Z",
        closeDate: "2026-07-08T17:45:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.2,
        entryPrice: 3979.50,
        exitPrice: 3961.20,
        symbol: "XAUUSD",
        openDate: "2026-07-10T07:50:00Z",
        closeDate: "2026-07-10T15:30:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.5,
        entryPrice: 3970.80,
        exitPrice: 4001.30,
        symbol: "XAUUSD",
        openDate: "2026-07-14T10:05:00Z",
        closeDate: "2026-07-15T12:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.5,
        entryPrice: 4012.60,
        exitPrice: 4025.40,
        symbol: "XAUUSD",
        openDate: "2026-07-16T08:40:00Z",
        closeDate: "2026-07-16T16:10:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 4008.90,
        exitPrice: 4032.15,
        symbol: "XAUUSD",
        openDate: "2026-07-17T09:15:00Z",
        closeDate: "2026-07-17T18:25:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 3.0,
        entryPrice: 4015.40,
        exitPrice: 4041.90,
        symbol: "XAUUSD",
        openDate: "2026-07-21T07:35:00Z",
        closeDate: "2026-07-22T13:50:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 2.0,
        entryPrice: 4048.70,
        exitPrice: 4029.95,
        symbol: "XAUUSD",
        openDate: "2026-07-23T11:10:00Z",
        closeDate: "2026-07-23T19:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.8,
        entryPrice: 4022.30,
        exitPrice: 4013.80,
        symbol: "XAUUSD",
        openDate: "2026-07-27T08:25:00Z",
        closeDate: "2026-07-27T12:55:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.5,
        entryPrice: 4030.60,
        exitPrice: 4064.10,
        symbol: "XAUUSD",
        openDate: "2026-07-29T09:45:00Z",
        closeDate: "2026-07-30T15:15:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 4038.50,
        exitPrice: 4067.83,
        symbol: "XAUUSD",
        openDate: "2026-07-31T08:05:00Z",
        closeDate: "2026-08-01T10:35:00Z",
      }
    ],
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 4447.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.5,
        entryPrice: 4467.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.0,
        entryPrice: 4501.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      }
    ]
  },
  "140526": {
    user: {
      name: "Divyani Patil",
      email: "divyanipatil@gmail.com",
      phone: "+91 9641XXXXXX",
    },
    balance: 100000,
    pnl: 24750,
    equity: 150000,
    initialDepositAmount: 100000,
    initialDepositDate: "2026-05-14T00:00:00Z",
    closedTrades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.5,
        entryPrice: 3808.40,
        exitPrice: 3826.90,
        symbol: "XAUUSD",
        openDate: "2026-05-15T09:20:00Z",
        closeDate: "2026-05-16T13:45:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.0,
        entryPrice: 3841.20,
        exitPrice: 3829.70,
        symbol: "XAUUSD",
        openDate: "2026-05-19T08:10:00Z",
        closeDate: "2026-05-19T15:30:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 3835.60,
        exitPrice: 3820.85,
        symbol: "XAUUSD",
        openDate: "2026-05-21T10:25:00Z",
        closeDate: "2026-05-21T17:50:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.5,
        entryPrice: 3814.30,
        exitPrice: 3836.50,
        symbol: "XAUUSD",
        openDate: "2026-05-26T07:55:00Z",
        closeDate: "2026-05-27T12:15:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 3852.70,
        exitPrice: 3871.95,
        symbol: "XAUUSD",
        openDate: "2026-06-02T09:05:00Z",
        closeDate: "2026-06-03T11:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.8,
        entryPrice: 3868.40,
        exitPrice: 3859.15,
        symbol: "XAUUSD",
        openDate: "2026-06-05T08:30:00Z",
        closeDate: "2026-06-05T14:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.5,
        entryPrice: 3902.60,
        exitPrice: 3884.10,
        symbol: "XAUUSD",
        openDate: "2026-06-10T10:45:00Z",
        closeDate: "2026-06-10T18:05:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.5,
        entryPrice: 3878.90,
        exitPrice: 3901.30,
        symbol: "XAUUSD",
        openDate: "2026-06-16T07:40:00Z",
        closeDate: "2026-06-17T13:10:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.2,
        entryPrice: 3925.80,
        exitPrice: 3941.05,
        symbol: "XAUUSD",
        openDate: "2026-06-22T09:50:00Z",
        closeDate: "2026-06-22T16:35:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 3932.40,
        exitPrice: 3952.20,
        symbol: "XAUUSD",
        openDate: "2026-06-25T08:15:00Z",
        closeDate: "2026-06-26T12:50:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.2,
        entryPrice: 3968.50,
        exitPrice: 3990.75,
        symbol: "XAUUSD",
        openDate: "2026-07-07T09:35:00Z",
        closeDate: "2026-07-08T15:25:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.5,
        entryPrice: 4002.30,
        exitPrice: 3987.90,
        symbol: "XAUUSD",
        openDate: "2026-07-15T08:45:00Z",
        closeDate: "2026-07-15T14:55:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.0,
        entryPrice: 4038.60,
        exitPrice: 4021.35,
        symbol: "XAUUSD",
        openDate: "2026-07-22T10:20:00Z",
        closeDate: "2026-07-22T19:15:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.5,
        entryPrice: 4042.80,
        exitPrice: 4053.30,
        symbol: "XAUUSD",
        openDate: "2026-08-01T09:10:00Z",
        closeDate: "2026-08-03T11:30:00Z",
      }
    ],
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 3.0,
        entryPrice: 4437.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.5,
        entryPrice: 4460.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.5,
        entryPrice: 4507.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 5).toISOString(),
      }
    ]
  },
  "160326": {
    user: {
      name: "Hitesh",
      email: "hitesh1603@gmail.com",
      phone: "+91 9358XXXXXX",
    },
    balance: 300000,
    pnl: 61500,
    equity: 1350000,
    initialDepositAmount: 300000,
    initialDepositDate: "2026-03-16T00:00:00Z",
    closedTrades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 6.0,
        entryPrice: 3624.30,
        exitPrice: 3655.55,
        symbol: "XAUUSD",
        openDate: "2026-03-17T08:30:00Z",
        closeDate: "2026-03-19T14:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 7.0,
        entryPrice: 3641.80,
        exitPrice: 3668.30,
        symbol: "XAUUSD",
        openDate: "2026-03-20T09:15:00Z",
        closeDate: "2026-03-24T13:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 4.0,
        entryPrice: 3684.90,
        exitPrice: 3663.65,
        symbol: "XAUUSD",
        openDate: "2026-03-25T10:05:00Z",
        closeDate: "2026-03-26T16:35:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 8.0,
        entryPrice: 3658.20,
        exitPrice: 3676.95,
        symbol: "XAUUSD",
        openDate: "2026-03-27T07:45:00Z",
        closeDate: "2026-03-31T12:10:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 3672.40,
        exitPrice: 3668.40,
        symbol: "XAUUSD",
        openDate: "2026-03-31T09:30:00Z",
        closeDate: "2026-03-31T15:45:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 9.0,
        entryPrice: 3698.60,
        exitPrice: 3731.10,
        symbol: "XAUUSD",
        openDate: "2026-04-01T08:20:00Z",
        closeDate: "2026-04-03T16:30:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 8.0,
        entryPrice: 3714.90,
        exitPrice: 3699.65,
        symbol: "XAUUSD",
        openDate: "2026-04-06T09:40:00Z",
        closeDate: "2026-04-07T14:55:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 11.0,
        entryPrice: 3706.80,
        exitPrice: 3745.55,
        symbol: "XAUUSD",
        openDate: "2026-04-09T07:55:00Z",
        closeDate: "2026-04-14T12:45:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 7.0,
        entryPrice: 3760.40,
        exitPrice: 3737.90,
        symbol: "XAUUSD",
        openDate: "2026-04-16T10:15:00Z",
        closeDate: "2026-04-17T15:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 12.0,
        entryPrice: 3742.60,
        exitPrice: 3776.35,
        symbol: "XAUUSD",
        openDate: "2026-04-20T08:10:00Z",
        closeDate: "2026-04-24T14:50:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 9.0,
        entryPrice: 3771.30,
        exitPrice: 3798.05,
        symbol: "XAUUSD",
        openDate: "2026-04-27T09:25:00Z",
        closeDate: "2026-04-29T13:15:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 14.0,
        entryPrice: 3805.90,
        exitPrice: 3832.15,
        symbol: "XAUUSD",
        openDate: "2026-05-04T08:35:00Z",
        closeDate: "2026-05-06T15:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 10.0,
        entryPrice: 3839.70,
        exitPrice: 3814.95,
        symbol: "XAUUSD",
        openDate: "2026-05-07T10:50:00Z",
        closeDate: "2026-05-11T12:25:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 12.0,
        entryPrice: 3821.40,
        exitPrice: 3803.65,
        symbol: "XAUUSD",
        openDate: "2026-05-12T09:05:00Z",
        closeDate: "2026-05-13T16:45:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 16.0,
        entryPrice: 3808.80,
        exitPrice: 3842.55,
        symbol: "XAUUSD",
        openDate: "2026-05-15T07:50:00Z",
        closeDate: "2026-05-20T14:30:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 15.0,
        entryPrice: 3817.60,
        exitPrice: 3846.35,
        symbol: "XAUUSD",
        openDate: "2026-05-22T08:45:00Z",
        closeDate: "2026-05-27T11:55:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 13.0,
        entryPrice: 3812.40,
        exitPrice: 3831.15,
        symbol: "XAUUSD",
        openDate: "2026-05-28T09:35:00Z",
        closeDate: "2026-05-29T13:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 10.0,
        entryPrice: 3844.60,
        exitPrice: 3821.30,
        symbol: "XAUUSD",
        openDate: "2026-05-29T15:10:00Z",
        closeDate: "2026-05-29T19:45:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 18.0,
        entryPrice: 3856.20,
        exitPrice: 3891.45,
        symbol: "XAUUSD",
        openDate: "2026-06-01T09:10:00Z",
        closeDate: "2026-06-04T15:25:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 15.0,
        entryPrice: 3872.60,
        exitPrice: 3857.35,
        symbol: "XAUUSD",
        openDate: "2026-06-08T08:25:00Z",
        closeDate: "2026-06-09T14:10:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 12.0,
        entryPrice: 3905.90,
        exitPrice: 3878.40,
        symbol: "XAUUSD",
        openDate: "2026-06-10T10:35:00Z",
        closeDate: "2026-06-12T13:50:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 20.0,
        entryPrice: 3884.70,
        exitPrice: 3922.20,
        symbol: "XAUUSD",
        openDate: "2026-06-15T07:40:00Z",
        closeDate: "2026-06-19T16:15:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 16.0,
        entryPrice: 3914.30,
        exitPrice: 3901.05,
        symbol: "XAUUSD",
        openDate: "2026-06-22T09:20:00Z",
        closeDate: "2026-06-23T12:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 22.0,
        entryPrice: 3908.60,
        exitPrice: 3946.35,
        symbol: "XAUUSD",
        openDate: "2026-06-24T08:15:00Z",
        closeDate: "2026-06-29T11:30:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 13.0,
        entryPrice: 3951.80,
        exitPrice: 3929.05,
        symbol: "XAUUSD",
        openDate: "2026-06-29T13:45:00Z",
        closeDate: "2026-06-30T17:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 24.0,
        entryPrice: 3967.40,
        exitPrice: 4001.15,
        symbol: "XAUUSD",
        openDate: "2026-07-01T08:50:00Z",
        closeDate: "2026-07-06T14:35:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 15.0,
        entryPrice: 4009.80,
        exitPrice: 4033.55,
        symbol: "XAUUSD",
        openDate: "2026-07-08T09:30:00Z",
        closeDate: "2026-07-09T16:50:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 26.0,
        entryPrice: 3999.20,
        exitPrice: 4041.70,
        symbol: "XAUUSD",
        openDate: "2026-07-13T07:35:00Z",
        closeDate: "2026-07-17T15:05:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 20.0,
        entryPrice: 4026.90,
        exitPrice: 4054.40,
        symbol: "XAUUSD",
        openDate: "2026-07-20T08:15:00Z",
        closeDate: "2026-07-24T12:20:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 14.0,
        entryPrice: 4051.30,
        exitPrice: 4020.05,
        symbol: "XAUUSD",
        openDate: "2026-07-27T10:40:00Z",
        closeDate: "2026-07-29T14:55:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 12.5,
        entryPrice: 4030.80,
        exitPrice: 4059.10,
        symbol: "XAUUSD",
        openDate: "2026-07-30T08:05:00Z",
        closeDate: "2026-07-31T16:40:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 20.0,
        entryPrice: 4040.90,
        exitPrice: 4069.40,
        symbol: "XAUUSD",
        openDate: "2026-08-01T09:00:00Z",
        closeDate: "2026-08-02T14:00:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 10.0,
        entryPrice: 4066.20,
        exitPrice: 4049.70,
        symbol: "XAUUSD",
        openDate: "2026-08-02T15:20:00Z",
        closeDate: "2026-08-03T12:10:00Z",
      }
    ],
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 5.0,
        entryPrice: 4417.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 4.0,
        entryPrice: 4452.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.5,
        entryPrice: 4457.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 2.0,
        entryPrice: 4512.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 6).toISOString(),
      }
    ]
  },
  "011025": {
    user: {
      name: "BHARAT GADHIYA",
      email: "bharatgadhiya@gmail.com",
      phone: "+91 9705XXXXXX",
    },
    balance: 72502.48,
    pnl: 2497.36,
    equity: 74999.84,
    initialDepositAmount: 35000,
    initialDepositDate: "2025-10-01T00:00:00Z",
    transactions: [
      {
        id: crypto.randomUUID(),
        type: "DEPOSIT",
        amount: 35000,
        date: "2025-10-01T00:00:00Z",
        status: "Completed",
      }
    ],
    closedTrades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 8.0,
        entryPrice: 3863.25,
        exitPrice: 3883.25,
        symbol: "XAUUSD",
        openDate: "2025-11-03T08:20:00Z",
        closeDate: "2025-11-07T14:35:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 6.0,
        entryPrice: 4050.00,
        exitPrice: 4075.00,
        symbol: "XAUUSD",
        openDate: "2026-03-10T09:10:00Z",
        closeDate: "2026-03-14T15:45:00Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 5.0,
        entryPrice: 4200.00,
        exitPrice: 4213.00496,
        symbol: "XAUUSD",
        openDate: "2026-06-15T07:50:00Z",
        closeDate: "2026-06-20T13:25:00Z",
      }
    ],
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.02,
        entryPrice: 3863.25,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.01,
        entryPrice: 3863.25,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.01,
        entryPrice: 3863.25,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      }
    ]
  },
  "030226": {
    user: {
      name: "SUSHEEL PATIL",
      email: "susheelpatil@gmail.com",
      phone: "+91 9834XXXXXX",
    },
    balance: 1800000,
    pnl: 0,
    equity: 1800000,
    initialDepositAmount: 500000,
    initialDepositDate: "2026-02-03T00:00:00Z",
    transactions: [
      {
        id: crypto.randomUUID(),
        type: "DEPOSIT",
        amount: 500000,
        date: "2026-02-03T00:00:00Z",
        status: "Completed",
      }
    ],
    closedTrades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 15.50,
        entryPrice: 3995.04,
        exitPrice: 3966.63,
        sl: 3967.3,
        tp: 4041.6,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-02-06T10:04:00.000Z",
        closeDate: "2026-02-11T14:56:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 12.00,
        entryPrice: 3989.93,
        exitPrice: 4022.13,
        sl: 3961.73,
        tp: 4042.12,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-02-12T14:01:00.000Z",
        closeDate: "2026-02-18T17:37:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 15.00,
        entryPrice: 4010.76,
        exitPrice: 4036.97,
        sl: 3984.16,
        tp: 4049.11,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-02-20T11:19:00.000Z",
        closeDate: "2026-02-25T13:46:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 14.50,
        entryPrice: 4053.49,
        exitPrice: 4077.7,
        sl: 4077.91,
        tp: 4010.89,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-02-26T13:46:00.000Z",
        closeDate: "2026-02-27T14:11:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 16.50,
        entryPrice: 4043.51,
        exitPrice: 4020.26,
        sl: 4019.36,
        tp: 4074.98,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-03-03T12:18:00.000Z",
        closeDate: "2026-03-04T15:16:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 12.00,
        entryPrice: 4076.29,
        exitPrice: 4090.18,
        sl: 4044.1,
        tp: 4130.37,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-03-05T13:03:00.000Z",
        closeDate: "2026-03-09T15:35:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 13.50,
        entryPrice: 4098.81,
        exitPrice: 4061.11,
        sl: 4127.22,
        tp: 4058.75,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-03-10T13:56:00.000Z",
        closeDate: "2026-03-12T13:31:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 17.00,
        entryPrice: 4066.06,
        exitPrice: 4090.93,
        sl: 4090.39,
        tp: 4032.13,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-03-13T09:31:00.000Z",
        closeDate: "2026-03-16T17:34:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 12.00,
        entryPrice: 4120.98,
        exitPrice: 4068.75,
        sl: 4153.8,
        tp: 4067.85,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-03-17T08:44:00.000Z",
        closeDate: "2026-03-19T17:31:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 17.00,
        entryPrice: 4078.56,
        exitPrice: 4095.32,
        sl: 4053.34,
        tp: 4112.21,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-03-20T14:17:00.000Z",
        closeDate: "2026-03-24T16:25:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 16.50,
        entryPrice: 4109.46,
        exitPrice: 4118.49,
        sl: 4079.69,
        tp: 4162,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-03-25T11:25:00.000Z",
        closeDate: "2026-03-31T13:44:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 17.00,
        entryPrice: 4122.65,
        exitPrice: 4143.24,
        sl: 4094.5,
        tp: 4165.46,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-04-02T15:27:00.000Z",
        closeDate: "2026-04-06T15:59:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 18.00,
        entryPrice: 4138.72,
        exitPrice: 4157.75,
        sl: 4105.3,
        tp: 4183.34,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-04-10T12:07:00.000Z",
        closeDate: "2026-04-15T17:25:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 17.00,
        entryPrice: 4170.67,
        exitPrice: 4132.4,
        sl: 4194.71,
        tp: 4131.63,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-04-16T15:23:00.000Z",
        closeDate: "2026-04-20T15:45:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 20.00,
        entryPrice: 4110.19,
        exitPrice: 4159.23,
        sl: 4076.77,
        tp: 4158.67,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-04-21T13:59:00.000Z",
        closeDate: "2026-04-22T13:56:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 25.50,
        entryPrice: 4184.01,
        exitPrice: 4216.26,
        sl: 4215.43,
        tp: 4130.94,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-04-27T10:04:00.000Z",
        closeDate: "2026-04-29T14:21:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 19.00,
        entryPrice: 4198.93,
        exitPrice: 4134.32,
        sl: 4233.38,
        tp: 4134.68,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-04-30T09:47:00.000Z",
        closeDate: "2026-05-05T13:06:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 25.50,
        entryPrice: 4160.21,
        exitPrice: 4191.72,
        sl: 4190.12,
        tp: 4111.23,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-05-06T08:39:00.000Z",
        closeDate: "2026-05-07T15:51:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 21.00,
        entryPrice: 4187.02,
        exitPrice: 4200.37,
        sl: 4155.6,
        tp: 4233.76,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-05-08T13:29:00.000Z",
        closeDate: "2026-05-14T13:50:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 25.00,
        entryPrice: 4229.11,
        exitPrice: 4194.53,
        sl: 4254.03,
        tp: 4194.36,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-05-15T14:35:00.000Z",
        closeDate: "2026-05-21T13:36:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 28.00,
        entryPrice: 4196.37,
        exitPrice: 4173.41,
        sl: 4231.11,
        tp: 4147.32,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-05-22T10:38:00.000Z",
        closeDate: "2026-05-26T13:21:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 27.00,
        entryPrice: 4170.52,
        exitPrice: 4199.05,
        sl: 4140.55,
        tp: 4220.91,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-05-27T14:26:00.000Z",
        closeDate: "2026-06-01T16:47:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 28.00,
        entryPrice: 4188.89,
        exitPrice: 4241.15,
        sl: 4159.99,
        tp: 4241.44,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-06-02T08:47:00.000Z",
        closeDate: "2026-06-04T17:10:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 28.50,
        entryPrice: 4243.14,
        exitPrice: 4271.44,
        sl: 4270.64,
        tp: 4191.1,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-06-05T08:30:00.000Z",
        closeDate: "2026-06-08T16:04:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 31.50,
        entryPrice: 4267.7,
        exitPrice: 4292.39,
        sl: 4237.61,
        tp: 4310.84,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-06-09T09:51:00.000Z",
        closeDate: "2026-06-11T17:37:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 27.50,
        entryPrice: 4279.31,
        exitPrice: 4309.26,
        sl: 4307.66,
        tp: 4241.09,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-06-12T14:54:00.000Z",
        closeDate: "2026-06-15T17:08:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 26.00,
        entryPrice: 4302.54,
        exitPrice: 4253.29,
        sl: 4335.8,
        tp: 4254.41,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-06-16T08:36:00.000Z",
        closeDate: "2026-06-17T13:35:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 30.50,
        entryPrice: 4270.46,
        exitPrice: 4240.34,
        sl: 4242.55,
        tp: 4315.02,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-06-18T11:04:00.000Z",
        closeDate: "2026-06-23T16:34:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 33.00,
        entryPrice: 4253.03,
        exitPrice: 4287.57,
        sl: 4286.55,
        tp: 4204.78,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-06-24T13:52:00.000Z",
        closeDate: "2026-06-26T14:21:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 28.00,
        entryPrice: 4298.39,
        exitPrice: 4342.43,
        sl: 4263.98,
        tp: 4343.29,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-06-29T14:56:00.000Z",
        closeDate: "2026-07-01T15:24:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 28.00,
        entryPrice: 4314.85,
        exitPrice: 4316.28,
        sl: 4286.42,
        tp: 4362.86,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-07-10T12:18:00.000Z",
        closeDate: "2026-07-16T14:43:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 30.00,
        entryPrice: 4341.2,
        exitPrice: 4381.76,
        sl: 4309.31,
        tp: 4382.72,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-07-17T12:21:00.000Z",
        closeDate: "2026-07-22T14:42:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 34.50,
        entryPrice: 4417.86,
        exitPrice: 4386.54,
        sl: 4450.17,
        tp: 4370.66,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-07-24T09:19:00.000Z",
        closeDate: "2026-07-29T15:52:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 34.00,
        entryPrice: 4411.49,
        exitPrice: 4392.77,
        sl: 4441.85,
        tp: 4358.14,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-08-03T11:10:00.000Z",
        closeDate: "2026-08-06T16:08:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 36.00,
        entryPrice: 4395,
        exitPrice: 4433.21,
        sl: 4368.58,
        tp: 4433.07,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-08-07T08:43:00.000Z",
        closeDate: "2026-08-11T16:14:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 42.00,
        entryPrice: 4432.23,
        exitPrice: 4478.36,
        sl: 4402.25,
        tp: 4478.71,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-08-12T13:38:00.000Z",
        closeDate: "2026-08-17T16:33:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 26.50,
        entryPrice: 4480.8,
        exitPrice: 4490.06,
        sl: 4474.83,
        tp: 4492.14,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-08-18T08:57:00.000Z",
        closeDate: "2026-08-20T13:20:00.000Z",
      },
    ],
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 18.00,
        entryPrice: 4486.09,
        sl: 4454.09,
        tp: 4537.29,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 12.00,
        entryPrice: 4488.34,
        sl: 4516.34,
        tp: 4443.54,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 15.00,
        entryPrice: 4489.99,
        sl: 4459.99,
        tp: 4537.99,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ]
  },
  // Name/email/phone pending from the account holder; the ID follows the
  // DDMMYY-of-deposit convention and the password the Name@DDMM one.
  "310826": {
    user: {
      name: "NEW CLIENT",
      email: "newclient@gmail.com",
      phone: "+91 9812XXXXXX",
    },
    balance: 1500,
    pnl: 60,
    equity: 1560,
    initialDepositAmount: 1500,
    initialDepositDate: "2026-08-31T00:00:00Z",
    transactions: [
      {
        id: crypto.randomUUID(),
        type: "DEPOSIT",
        amount: 1500,
        date: "2026-08-31T00:00:00Z",
        status: "Completed",
      }
    ],
    // Funded today, so nothing has been closed yet: the whole $60 is floating.
    closedTrades: [],
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.05,
        entryPrice: 4479.35,
        sl: 4471.35,
        tp: 4495.35,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.04,
        entryPrice: 4482.89,
        sl: 4475.89,
        tp: 4497.89,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
    ]
  },
  "010826": {
    user: {
      name: "SUYOJIT",
      email: "suyojit@gmail.com",
      phone: "+91 9767XXXXXX",
    },
    // Funded 25,000, took 5,000 of realised profit back out on 31 Aug, so the
    // book carries 20,000 of net capital plus the 5,000 it closed in August.
    balance: 25000,
    pnl: 1200,
    equity: 26200,
    initialDepositAmount: 25000,
    initialDepositDate: "2026-08-01T00:00:00Z",
    transactions: [
      {
        id: crypto.randomUUID(),
        type: "WITHDRAW",
        amount: 5000,
        date: "2026-08-31T00:00:00Z",
        status: "Completed",
      },
      {
        id: crypto.randomUUID(),
        type: "DEPOSIT",
        amount: 25000,
        date: "2026-08-01T00:00:00Z",
        status: "Completed",
      }
    ],
    // August's realised ledger nets to exactly the 5,000 that was withdrawn.
    closedTrades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.80,
        entryPrice: 4402.15,
        exitPrice: 4425.40,
        sl: 4386.15,
        tp: 4425.15,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-08-04T09:25:00.000Z",
        closeDate: "2026-08-06T15:40:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 0.60,
        entryPrice: 4441.80,
        exitPrice: 4419.55,
        sl: 4461.80,
        tp: 4419.30,
        closeReason: "TP",
        symbol: "XAUUSD",
        openDate: "2026-08-10T11:05:00.000Z",
        closeDate: "2026-08-12T14:20:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.50,
        entryPrice: 4428.30,
        exitPrice: 4413.90,
        sl: 4413.90,
        tp: 4459.30,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-08-13T08:50:00.000Z",
        closeDate: "2026-08-14T13:35:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.90,
        entryPrice: 4451.20,
        exitPrice: 4472.60,
        sl: 4434.20,
        tp: 4484.20,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-08-17T10:15:00.000Z",
        closeDate: "2026-08-20T16:05:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 0.40,
        entryPrice: 4494.10,
        exitPrice: 4485.10,
        sl: 4512.10,
        tp: 4463.10,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-08-24T12:40:00.000Z",
        closeDate: "2026-08-26T14:55:00.000Z",
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.50,
        entryPrice: 4470.20,
        exitPrice: 4474.98,
        sl: 4455.20,
        tp: 4499.20,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-08-27T09:35:00.000Z",
        closeDate: "2026-08-28T15:10:00.000Z",
      }
    ],
    // Open book floats +1,200 at XAUUSD_BASE_PRICE and moves from there.
    trades: [
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.50,
        entryPrice: 4475.59,
        sl: 4455.59,
        tp: 4515.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.40,
        entryPrice: 4478.59,
        sl: 4460.59,
        tp: 4514.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 0.30,
        entryPrice: 4495.59,
        sl: 4517.59,
        tp: 4459.59,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      }
    ]
  },
  // --- September 2026 intake -------------------------------------------------
  // Both funded on 01 Sep 2026, so the DDMMYY-of-deposit id convention collides:
  // the 10,000 book keeps 010926 and the 5,000 book takes 100926, the date its
  // statement is drawn to. Both books belong to the same holder, Sunita More,
  // so they share an identity and differ only in size and mandate.
  //
  // Every closed trade below is priced off the REAL gold tape for 01-09 Sep 2026
  // (Binance PAXGUSDT daily bars, the same feed XAUUSD streams from):
  //   01 Sep  O 4451.13  H 4460.77  L 4335.23  C 4337.89
  //   02 Sep  O 4337.48  H 4405.35  L 4286.97  C 4394.57
  //   03 Sep  O 4394.56  H 4512.33  L 4391.91  C 4482.51
  //   04 Sep  O 4481.95  H 4489.97  L 4375.00  C 4431.81
  //   07 Sep  O 4421.10  H 4427.77  L 4383.85  C 4423.43
  //   08 Sep  O 4424.45  H 4442.99  L 4350.00  C 4354.48
  //   09 Sep  O 4354.49  H 4433.72  L 4347.11  C 4395.04
  //   10 Sep  O 4394.00  H 4433.00  L 4391.01     4407.11 (live)
  // 05-06 Sep is the weekend and is closed, so nothing trades across it. Entries
  // sit inside the real range of the day they filled, every stop that was NOT
  // hit sits outside it, and every SL exit sits on a level the day did trade.
  "010926": {
    user: {
      name: "SUNITA MORE",
      email: "sunitamore@gmail.com",
      phone: "+91 9702XXXXXX",
    },
    balance: 10000,
    pnl: 90,
    equity: 10650,
    initialDepositAmount: 10000,
    initialDepositDate: "2026-09-01T00:00:00Z",
    transactions: [
      {
        id: crypto.randomUUID(),
        type: "DEPOSIT",
        amount: 10000,
        date: "2026-09-01T00:00:00Z",
        status: "Completed",
      }
    ],
    // Seven closed trades = exactly +560.00 realised, so balance = 10,560.00.
    closedTrades: [
      {
        // Sold the 01 Sep break: a 4451 open unwound to a 4337 close.
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 0.03,
        entryPrice: 4448.60,
        exitPrice: 4372.40,
        sl: 4472.60,
        tp: 4328.00,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-09-01T08:15:00.000Z",
        closeDate: "2026-09-01T15:40:00.000Z",
      },
      {
        // Bought 02 Sep near the 4286.97 low, stop parked under it.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.03,
        entryPrice: 4310.75,
        exitPrice: 4378.20,
        sl: 4284.00,
        tp: 4412.00,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-09-02T07:05:00.000Z",
        closeDate: "2026-09-02T14:20:00.000Z",
      },
      {
        // 03 Sep ran 4394 -> 4512; target left above the high, banked manually.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.02,
        entryPrice: 4402.30,
        exitPrice: 4478.90,
        sl: 4380.00,
        tp: 4520.00,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-09-03T09:30:00.000Z",
        closeDate: "2026-09-03T16:10:00.000Z",
      },
      {
        // Faded the 04 Sep high at 4489.97, covered into the 4431.81 close.
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 0.02,
        entryPrice: 4483.10,
        exitPrice: 4438.60,
        sl: 4495.00,
        tp: 4370.00,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-09-04T08:00:00.000Z",
        closeDate: "2026-09-04T17:05:00.000Z",
      },
      {
        // Monday chop: 07 Sep dipped to 4383.85 and took the stop out.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.04,
        entryPrice: 4420.50,
        exitPrice: 4389.30,
        sl: 4389.30,
        tp: 4460.00,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-09-07T09:12:00.000Z",
        closeDate: "2026-09-07T13:48:00.000Z",
      },
      {
        // Short into the 08 Sep slide from 4442.99 down to 4350.00.
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 0.05,
        entryPrice: 4437.90,
        exitPrice: 4413.65,
        sl: 4450.00,
        tp: 4340.00,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-09-08T10:25:00.000Z",
        closeDate: "2026-09-08T15:02:00.000Z",
      },
      {
        // Bought the 09 Sep push at 4425.60; the fade to 4395.04 took the stop.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.04,
        entryPrice: 4425.60,
        exitPrice: 4398.20,
        sl: 4398.20,
        tp: 4465.00,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-09-09T12:40:00.000Z",
        closeDate: "2026-09-09T18:15:00.000Z",
      },
    ],
    // Two positions still open, authored to float +90.00 on the 4487.59 basis
    // (re-anchored to live gold at login): 10,560.00 + 90.00 = 10,650.00 equity,
    // i.e. +650.00 on the 10,000 deposited.
    trades: [
      {
        // Long off the 10 Sep 4391.01 low, once re-anchored.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.04,
        entryPrice: 4472.59,
        sl: 4457.59,
        tp: 4517.59,
        symbol: "XAUUSD",
        openDate: "2026-09-10T05:40:00.000Z",
      },
      {
        // Short against the 10 Sep push toward 4433.00, once re-anchored.
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 0.02,
        entryPrice: 4502.59,
        sl: 4517.59,
        tp: 4462.59,
        symbol: "XAUUSD",
        openDate: "2026-09-10T07:25:00.000Z",
      },
    ]
  },
  "100926": {
    user: {
      name: "SUNITA MORE",
      email: "sunitamore@gmail.com",
      phone: "+91 9702XXXXXX",
    },
    balance: 5000,
    pnl: 70,
    equity: 5500,
    initialDepositAmount: 5000,
    initialDepositDate: "2026-09-01T00:00:00Z",
    transactions: [
      {
        id: crypto.randomUUID(),
        type: "DEPOSIT",
        amount: 5000,
        date: "2026-09-01T00:00:00Z",
        status: "Completed",
      }
    ],
    // Seven closed trades = exactly +430.00 realised, so balance = 5,430.00.
    closedTrades: [
      {
        // Rode 01 Sep almost the whole way down, 4455 -> 4348.
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 0.02,
        entryPrice: 4455.40,
        exitPrice: 4348.90,
        sl: 4468.00,
        tp: 4330.00,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-09-01T09:05:00.000Z",
        closeDate: "2026-09-01T16:25:00.000Z",
      },
      {
        // Caught the 02 Sep 4286.97 low almost exactly.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.02,
        entryPrice: 4299.60,
        exitPrice: 4390.10,
        sl: 4282.00,
        tp: 4410.00,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-09-02T08:40:00.000Z",
        closeDate: "2026-09-02T15:15:00.000Z",
      },
      {
        // Long through the 03 Sep rally, out before the 4512.33 spike.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.03,
        entryPrice: 4408.90,
        exitPrice: 4471.30,
        sl: 4386.00,
        tp: 4520.00,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-09-03T07:50:00.000Z",
        closeDate: "2026-09-03T14:35:00.000Z",
      },
      {
        // Bought the 04 Sep open; the drop to 4375.00 took the stop first.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.02,
        entryPrice: 4478.30,
        exitPrice: 4432.20,
        sl: 4432.20,
        tp: 4520.00,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-09-04T08:20:00.000Z",
        closeDate: "2026-09-04T16:55:00.000Z",
      },
      {
        // The same 07 Sep chop that stopped the larger book out.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.03,
        entryPrice: 4420.90,
        exitPrice: 4388.10,
        sl: 4388.10,
        tp: 4462.00,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-09-07T08:35:00.000Z",
        closeDate: "2026-09-07T13:20:00.000Z",
      },
      {
        // The 08 Sep slide, held from 4440.10 down to 4356.60.
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 0.02,
        entryPrice: 4440.10,
        exitPrice: 4356.60,
        sl: 4452.00,
        tp: 4345.00,
        closeReason: "MANUAL",
        symbol: "XAUUSD",
        openDate: "2026-09-08T09:45:00.000Z",
        closeDate: "2026-09-08T16:40:00.000Z",
      },
      {
        // Chased the 09 Sep high at 4429.80; the 4347.11 flush took the stop.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.02,
        entryPrice: 4429.80,
        exitPrice: 4366.00,
        sl: 4366.00,
        tp: 4470.00,
        closeReason: "SL",
        symbol: "XAUUSD",
        openDate: "2026-09-09T11:30:00.000Z",
        closeDate: "2026-09-09T17:50:00.000Z",
      },
    ],
    // Two longs still open, authored to float +70.00 on the 4487.59 basis:
    // 5,430.00 + 70.00 = 5,500.00 equity, i.e. +500.00 on the 5,000 deposited.
    trades: [
      {
        // Long off the 10 Sep 4391.01 low, once re-anchored.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.03,
        entryPrice: 4472.59,
        sl: 4457.59,
        tp: 4517.59,
        symbol: "XAUUSD",
        openDate: "2026-09-10T05:40:00.000Z",
      },
      {
        // Averaged in a little higher the same morning.
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 0.02,
        entryPrice: 4475.09,
        sl: 4460.09,
        tp: 4520.09,
        symbol: "XAUUSD",
        openDate: "2026-09-10T06:05:00.000Z",
      },
    ]
  }
};

const INITIAL_PRICE = XAUUSD_BASE_PRICE;

// Funding ledger: an explicit seed list when the account has one, otherwise the
// single initial deposit.
function getSeedTransactions(data: (typeof USERS_DATA)[string]): Transaction[] {
  if (data.transactions) return data.transactions;
  return [
    {
      id: crypto.randomUUID(),
      type: "DEPOSIT",
      amount: data.initialDepositAmount ?? data.balance,
      date: data.initialDepositDate ?? new Date("2026-07-01T00:00:00Z").toISOString(),
      status: "Completed",
    }
  ];
}

// Balance = net deposited capital (deposits − withdrawals) + realized P/L from
// the closed-trade ledger.
function getStartingBalance(data: (typeof USERS_DATA)[string]): number {
  const netDeposits = getSeedTransactions(data).reduce(
    (acc, tx) => acc + (tx.type === "DEPOSIT" ? tx.amount : -tx.amount),
    0
  );
  return netDeposits + calculateClosedProfit(data.closedTrades ?? []);
}

// --- Persistence ------------------------------------------------------------

const STORAGE_PREFIX = "tradeelite:account:";
// Bumped when saved data stops being comparable with the current price basis.
// v2: XAUUSD moved from a pinned 4487.59 simulation to the live gold feed, so
// v1 books hold entry prices from the old basis and would show inflated P/L and
// price lines stranded far below the candles.
const PERSIST_VERSION = 2;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

/**
 * Saved progress for one account. Returns null on anything unexpected so a
 * corrupt or outdated entry falls back to the seeded book instead of throwing.
 */
function loadPersisted(userId: string): PersistedAccount | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAccount;
    if (parsed?.version !== PERSIST_VERSION || !Array.isArray(parsed.trades)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersisted(userId: string, data: Omit<PersistedAccount, "version">) {
  try {
    localStorage.setItem(
      storageKey(userId),
      JSON.stringify({ version: PERSIST_VERSION, ...data })
    );
  } catch {
    /* private mode or a full quota: the session still works, it just won't persist */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [activeUserId, setActiveUserId] = useState<string>("140830");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const currentUserData = USERS_DATA[activeUserId];

  const [balance, setBalance] = useState(() => getStartingBalance(currentUserData));
  const balanceRef = useRef(getStartingBalance(currentUserData));
  const [transactions, setTransactions] = useState<Transaction[]>(() => getSeedTransactions(currentUserData));
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [trades, setTrades] = useState<Trade[]>(currentUserData.trades);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>(currentUserData.closedTrades ?? []);

  // Ticks land in a ref and are flushed on a fixed cadence: the Binance socket
  // can fire many times a second, and re-rendering the whole dashboard on every
  // trade print is wasted work.
  const pricesRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const unsubscribes = allSymbols().map((spec) =>
      subscribeToPrice(spec.id, (price) => {
        pricesRef.current[spec.id] = price;
      })
    );
    const flush = setInterval(() => setPrices({ ...pricesRef.current }), 250);
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      clearInterval(flush);
    };
  }, []);

  // Seeded positions were authored against XAUUSD_BASE_PRICE. Gold is a live
  // feed now, so those entries are re-anchored to the real market once a price
  // arrives — each account still opens on the exact floating P/L it was written
  // to show, and moves with the market from there. Only applies to a seeded
  // book; a restored one already holds real entry prices.
  const seededRef = useRef(true);
  const anchoredForRef = useRef<string | null>(null);

  // One shared clock rather than a timer per badge.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(tick);
  }, []);

  const priceOf = useCallback(
    (symbol: string) => {
      const id = getSpec(symbol).id;
      return prices[id] ?? pricesRef.current[id] ?? getPrice(id);
    },
    [prices]
  );

  const currentPrice = prices[DEFAULT_SYMBOL.id] ?? INITIAL_PRICE;

  const floatingPnL = useMemo(() => calculateTotalPnL(trades, prices), [trades, prices]);
  const closedProfit = useMemo(() => calculateClosedProfit(closedTrades), [closedTrades]);
  const equity = balance + floatingPnL;

  const usedMargin = useMemo(
    () =>
      trades.reduce(
        (acc, t) => acc + calculateMargin(t.symbol, t.lot, t.entryPrice, LEVERAGE),
        0
      ),
    [trades]
  );
  const freeMargin = equity - usedMargin;
  const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : Infinity;
  const marginCall = usedMargin > 0 && marginLevel < MARGIN_CALL_LEVEL;
  // Cash may only leave the account down to the margin the open book requires.
  const withdrawable = Math.max(0, Math.min(balance, freeMargin));

  const login = useCallback((userId: string) => {
    const data = USERS_DATA[userId];
    if (!data) return;

    setActiveUserId(userId);
    setIsAuthenticated(true);

    anchoredForRef.current = null;

    // Resume where this account left off, or fall back to its seeded book.
    const saved = loadPersisted(userId);
    if (saved) {
      seededRef.current = false;
      setBalance(saved.balance);
      balanceRef.current = saved.balance;
      setTrades(saved.trades);
      setClosedTrades(saved.closedTrades);
      setTransactions(saved.transactions);
      return;
    }

    seededRef.current = true;
    const startingBalance = getStartingBalance(data);
    setBalance(startingBalance);
    balanceRef.current = startingBalance;
    setTrades(data.trades);
    setClosedTrades(data.closedTrades ?? []);
    setTransactions(getSeedTransactions(data));
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

  const withdrawableRef = useRef(withdrawable);
  withdrawableRef.current = withdrawable;

  const withdraw = useCallback((amount: number): boolean => {
    if (!(amount > 0) || amount > withdrawableRef.current) return false;

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

  // Order actions read the book through a ref rather than the `trades` state so
  // that two fills in the same tick both see the up-to-date list, and so a
  // stop-loss cannot fire twice before React re-renders.
  const tradesRef = useRef<Trade[]>(trades);
  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  const freeMarginRef = useRef(freeMargin);
  freeMarginRef.current = freeMargin;

  const slippageEstimate = useCallback(
    (symbol: string, lot: number) =>
      expectedSlippage(symbol, lot, volatilityMultiplier(symbol)),
    []
  );

  const applyTrades = useCallback((next: Trade[]) => {
    tradesRef.current = next;
    setTrades(next);
  }, []);

  const setTradesWrapper = useCallback(
    (newTrades: Trade[]) => applyTrades(newTrades),
    [applyTrades]
  );

  const openTrade = useCallback(
    (order: OrderRequest): OrderResult => {
      const spec = getSpec(order.symbol);
      const requested = Number(order.lot);

      if (!Number.isFinite(requested) || requested <= 0) {
        return { ok: false, error: "Lot size must be greater than 0" };
      }
      if (requested < MIN_LOT) {
        return { ok: false, error: `Minimum volume is ${MIN_LOT.toFixed(2)} lots` };
      }
      // Volume is dealt in whole steps, so a typed 0.153 fills as 0.15 rather
      // than being rejected — the same normalisation MT5 applies.
      const lot = normalizeLot(requested);

      if (!isSymbolOpen(spec.id)) {
        return { ok: false, error: `${spec.display} market is closed` };
      }

      const mid = pricesRef.current[spec.id] ?? getPrice(spec.id);
      if (!mid) {
        return { ok: false, error: `No live price for ${spec.display} yet` };
      }

      // Cross the spread, then slip: size walks the book and the tape moves
      // between the click and the fill.
      const fill = fillMarketOrder(
        spec.id,
        order.type,
        lot,
        mid,
        volatilityMultiplier(spec.id)
      );
      const entryPrice = fill.price;

      const required = calculateMargin(spec.id, lot, entryPrice, LEVERAGE);
      if (required > freeMarginRef.current) {
        return { ok: false, error: "Not enough free margin for this lot size" };
      }

      // Stops on the wrong side of the market would trigger the instant they
      // were placed, so reject them the way MT5 rejects invalid stops.
      const { sl, tp } = order;
      if (sl !== undefined) {
        const wrongSide = order.type === "BUY" ? sl >= entryPrice : sl <= entryPrice;
        if (wrongSide) {
          return {
            ok: false,
            error: `Stop loss must be ${order.type === "BUY" ? "below" : "above"} ${entryPrice.toFixed(spec.digits)}`,
          };
        }
      }
      if (tp !== undefined) {
        const wrongSide = order.type === "BUY" ? tp <= entryPrice : tp >= entryPrice;
        if (wrongSide) {
          return {
            ok: false,
            error: `Take profit must be ${order.type === "BUY" ? "above" : "below"} ${entryPrice.toFixed(spec.digits)}`,
          };
        }
      }

      const trade: Trade = {
        id: crypto.randomUUID(),
        type: order.type,
        lot,
        entryPrice,
        symbol: spec.display,
        openDate: new Date().toISOString(),
        sl,
        tp,
      };

      applyTrades([trade, ...tradesRef.current]);
      return { ok: true, trade, slippage: fill.slippage };
    },
    [applyTrades]
  );

  const closeTrade = useCallback(
    (id: string, reason: CloseReason = "MANUAL") => {
      const trade = tradesRef.current.find((t) => t.id === id);
      if (!trade) return;

      const spec = getSpec(trade.symbol);
      if (!isSymbolOpen(spec.id)) return;

      const mid = pricesRef.current[spec.id] ?? getPrice(spec.id);
      if (!mid) return;

      // Closing reverses the opening side and pays slippage again. A take
      // profit is a resting limit and fills at its level; a stop loss becomes a
      // market order when touched, so it slips like any other.
      const closeFill = fillCloseOrder(
        spec.id,
        trade.type,
        trade.lot,
        mid,
        volatilityMultiplier(spec.id)
      );
      const exitPrice =
        reason === "TP" && trade.tp !== undefined
          ? trade.tp
          : reason === "SL" && trade.sl !== undefined
            ? trade.sl + (trade.type === "BUY" ? -closeFill.slippage : closeFill.slippage)
            : closeFill.price;

      const profit = calculateTradePnL(trade, exitPrice);

      applyTrades(tradesRef.current.filter((t) => t.id !== id));
      setClosedTrades((prev) => [
        {
          ...trade,
          exitPrice,
          closeDate: new Date().toISOString(),
          closeReason: reason,
        },
        ...prev,
      ]);
      setBalance((b) => {
        const next = b + profit;
        balanceRef.current = next;
        return next;
      });
    },
    [applyTrades]
  );

  const closeAllTrades = useCallback(() => {
    tradesRef.current.map((t) => t.id).forEach((id) => closeTrade(id, "MANUAL"));
  }, [closeTrade]);

  const modifyTrade = useCallback(
    (id: string, changes: ModifyRequest): ModifyResult => {
      const trade = tradesRef.current.find((t) => t.id === id);
      if (!trade) return { ok: false, error: "That position is no longer open" };

      const spec = getSpec(trade.symbol);
      if (!isSymbolOpen(spec.id)) {
        return { ok: false, error: `${spec.display} market is closed` };
      }

      const mid = pricesRef.current[spec.id] ?? getPrice(spec.id);
      if (!mid) return { ok: false, error: `No live price for ${spec.display} yet` };

      // Levels are checked against the quote this position would actually close
      // on — the same side the stop engine watches — so an accepted level can
      // never be one that fires on the very next tick.
      const exit = trade.type === "BUY" ? bidPrice(spec.id, mid) : askPrice(spec.id, mid);
      const side = (below: string, above: string) => (trade.type === "BUY" ? below : above);

      const next: Trade = { ...trade };

      if (changes.sl !== undefined) {
        if (changes.sl === null) {
          next.sl = undefined;
        } else {
          if (!Number.isFinite(changes.sl) || changes.sl <= 0) {
            return { ok: false, error: "Stop loss is not a valid price" };
          }
          if (trade.type === "BUY" ? changes.sl >= exit : changes.sl <= exit) {
            return {
              ok: false,
              error: `Stop loss must be ${side("below", "above")} ${exit.toFixed(spec.digits)}`,
            };
          }
          next.sl = changes.sl;
        }
      }

      if (changes.tp !== undefined) {
        if (changes.tp === null) {
          next.tp = undefined;
        } else {
          if (!Number.isFinite(changes.tp) || changes.tp <= 0) {
            return { ok: false, error: "Take profit is not a valid price" };
          }
          if (trade.type === "BUY" ? changes.tp <= exit : changes.tp >= exit) {
            return {
              ok: false,
              error: `Take profit must be ${side("above", "below")} ${exit.toFixed(spec.digits)}`,
            };
          }
          next.tp = changes.tp;
        }
      }

      applyTrades(tradesRef.current.map((t) => (t.id === id ? next : t)));
      return { ok: true };
    },
    [applyTrades]
  );

  // Stop-loss / take-profit engine: every flushed tick is checked against the
  // side each position would actually close on.
  useEffect(() => {
    for (const trade of tradesRef.current) {
      const spec = getSpec(trade.symbol);
      if (!isSymbolOpen(spec.id)) continue;
      const mid = prices[spec.id];
      if (!mid) continue;

      const exit =
        trade.type === "BUY" ? bidPrice(spec.id, mid) : askPrice(spec.id, mid);

      if (trade.type === "BUY") {
        if (trade.sl !== undefined && exit <= trade.sl) closeTrade(trade.id, "SL");
        else if (trade.tp !== undefined && exit >= trade.tp) closeTrade(trade.id, "TP");
      } else {
        if (trade.sl !== undefined && exit >= trade.sl) closeTrade(trade.id, "SL");
        else if (trade.tp !== undefined && exit <= trade.tp) closeTrade(trade.id, "TP");
      }
    }
  }, [prices, closeTrade]);

  useEffect(() => {
    if (!isAuthenticated || !seededRef.current) return;
    if (anchoredForRef.current === activeUserId) return;

    const gold = prices[DEFAULT_SYMBOL.id];
    if (!gold) return;

    // Run once per account, even if the shift turns out to be negligible.
    anchoredForRef.current = activeUserId;
    const delta = gold - XAUUSD_BASE_PRICE;
    if (Math.abs(delta) < 0.005) return;

    applyTrades(
      tradesRef.current.map((trade) =>
        getSpec(trade.symbol).id === DEFAULT_SYMBOL.id
          ? {
              ...trade,
              entryPrice: trade.entryPrice + delta,
              sl: trade.sl === undefined ? undefined : trade.sl + delta,
              tp: trade.tp === undefined ? undefined : trade.tp + delta,
            }
          : trade
      )
    );
  }, [prices, isAuthenticated, activeUserId, applyTrades]);

  // Broker stop-out. Below STOP_OUT_LEVEL the biggest loser is closed, and the
  // next tick re-evaluates — so positions are shed one at a time until margin
  // level recovers, exactly as MT5 unwinds an account.
  useEffect(() => {
    const open = tradesRef.current;
    if (open.length === 0) return;

    const margin = open.reduce(
      (acc, t) => acc + calculateMargin(t.symbol, t.lot, t.entryPrice, LEVERAGE),
      0
    );
    if (margin <= 0) return;

    let floating = 0;
    let worst: { id: string; pnl: number } | null = null;
    for (const trade of open) {
      const price = prices[getSpec(trade.symbol).id];
      if (!price) return; // incomplete picture: do not liquidate on a guess
      const pnl = calculateTradePnL(trade, price);
      floating += pnl;
      if (!worst || pnl < worst.pnl) worst = { id: trade.id, pnl };
    }

    const level = ((balanceRef.current + floating) / margin) * 100;
    if (level >= STOP_OUT_LEVEL || !worst) return;
    if (!isSymbolOpen(open.find((t) => t.id === worst!.id)!.symbol)) return;

    closeTrade(worst.id, "MANUAL");
  }, [prices, closeTrade]);

  const resetAccount = useCallback(() => {
    const data = USERS_DATA[activeUserId];
    try {
      localStorage.removeItem(storageKey(activeUserId));
    } catch {
      /* nothing saved to clear */
    }
    seededRef.current = true;
    anchoredForRef.current = null;
    const startingBalance = getStartingBalance(data);
    setBalance(startingBalance);
    balanceRef.current = startingBalance;
    applyTrades(data.trades);
    setClosedTrades(data.closedTrades ?? []);
    setTransactions(getSeedTransactions(data));
  }, [activeUserId, applyTrades]);

  // Persist after every change, so a refresh resumes the same book.
  useEffect(() => {
    if (!isAuthenticated) return;
    savePersisted(activeUserId, { balance, trades, closedTrades, transactions });
  }, [isAuthenticated, activeUserId, balance, trades, closedTrades, transactions]);

  return (
    <StoreContext.Provider
      value={{
        balance,
        floatingPnL,
        equity,
        closedProfit,
        usedMargin,
        freeMargin,
        marginLevel,
        transactions,
        user,
        currentPrice,
        prices,
        priceOf,
        now,
        trades,
        closedTrades,
        isAuthenticated,
        login,
        logout,
        deposit,
        withdraw,
        marginCall,
        withdrawable,
        slippageEstimate,
        setTrades: setTradesWrapper,
        openTrade,
        closeTrade,
        closeAllTrades,
        modifyTrade,
        resetAccount,
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
