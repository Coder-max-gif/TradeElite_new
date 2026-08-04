import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Transaction, Trade, ClosedTrade, UserData } from "./store.types";
import { calculateTotalPnL, calculateClosedProfit } from "@/utils/pnlCalculator";
import { subscribeToPrice, XAUUSD_BASE_PRICE } from "@/services/priceService";

export type { Transaction, Trade, ClosedTrade, UserData };

interface StoreState {
  balance: number;
  floatingPnL: number;
  equity: number;
  closedProfit: number;
  transactions: Transaction[];
  user: UserData;
  currentPrice: number;
  trades: Trade[];
  closedTrades: ClosedTrade[];
  isAuthenticated: boolean;
  login: (userId: string) => void;
  logout: () => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => boolean;
  setTrades: (trades: Trade[]) => void;
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
        entryPrice: 4031.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.0,
        entryPrice: 4038.77,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.5,
        entryPrice: 4040.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 2.0,
        entryPrice: 4068.77,
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
        entryPrice: 4016.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 1.5,
        entryPrice: 4036.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.0,
        entryPrice: 4070.27,
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
        entryPrice: 4006.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.5,
        entryPrice: 4029.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 1.5,
        entryPrice: 4076.27,
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
        entryPrice: 3986.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 4.0,
        entryPrice: 4021.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "BUY",
        lot: 2.5,
        entryPrice: 4026.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "SELL",
        lot: 2.0,
        entryPrice: 4081.27,
        symbol: "XAUUSD",
        openDate: new Date(Date.now() - 86400000 * 6).toISOString(),
      }
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [activeUserId, setActiveUserId] = useState<string>("140830");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const currentUserData = USERS_DATA[activeUserId];

  const [balance, setBalance] = useState(() => getStartingBalance(currentUserData));
  const balanceRef = useRef(getStartingBalance(currentUserData));
  const [transactions, setTransactions] = useState<Transaction[]>(() => getSeedTransactions(currentUserData));
  const [currentPrice, setCurrentPrice] = useState(INITIAL_PRICE);
  const [trades, setTrades] = useState<Trade[]>(currentUserData.trades);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>(currentUserData.closedTrades ?? []);

  // Single live price engine: each tick updates the price, and floating P/L and
  // equity are derived from it in the same render cycle for every widget.
  useEffect(() => subscribeToPrice("OANDA:XAUUSD", setCurrentPrice), []);

  const floatingPnL = useMemo(
    () => calculateTotalPnL(trades, currentPrice),
    [trades, currentPrice]
  );
  const closedProfit = useMemo(
    () => calculateClosedProfit(closedTrades),
    [closedTrades]
  );
  const equity = balance + floatingPnL;

  const login = useCallback((userId: string) => {
    const data = USERS_DATA[userId];
    if (data) {
      setActiveUserId(userId);
      setIsAuthenticated(true);
      const startingBalance = getStartingBalance(data);
      setBalance(startingBalance);
      balanceRef.current = startingBalance;
      setTrades(data.trades);
      setClosedTrades(data.closedTrades ?? []);
      setTransactions(getSeedTransactions(data));
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

  const setTradesWrapper = useCallback((newTrades: Trade[]) => {
    setTrades(newTrades);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        balance,
        floatingPnL,
        equity,
        closedProfit,
        transactions,
        user,
        currentPrice,
        trades,
        closedTrades,
        isAuthenticated,
        login,
        logout,
        deposit,
        withdraw,
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
