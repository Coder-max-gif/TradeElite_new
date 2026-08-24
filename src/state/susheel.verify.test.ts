import { describe, expect, test } from "bun:test";
import { USERS_DATA, LEVERAGE, MARGIN_CALL_LEVEL } from "./store";
import {
  calculateClosedProfit,
  calculateClosedTradePnL,
  calculateTotalPnL,
  calculateMargin,
} from "@/utils/pnlCalculator";
import { XAUUSD_BASE_PRICE } from "@/services/priceService";
import { isSymbolOpen } from "@/lib/symbols";
import { expectedSlippage } from "@/lib/execution";

const account = USERS_DATA["030226"];
const DEPOSIT = 500000;
const closed = account.closedTrades!;

describe("Susheel Patil account seed", () => {
  test("deposits 500,000 on 3 Feb 2026 and nothing else", () => {
    expect(account.transactions).toHaveLength(1);
    expect(account.transactions![0]).toMatchObject({
      type: "DEPOSIT",
      amount: DEPOSIT,
      date: "2026-02-03T00:00:00Z",
      status: "Completed",
    });
  });

  test("realised P/L is exactly 1,300,000 by the app's own P/L math", () => {
    // The ledger is built so the sum is exact to the cent; summing 37 floats
    // leaves the usual sub-cent IEEE-754 dust, which every display rounds away.
    expect(calculateClosedProfit(closed)).toBeCloseTo(1300000, 2);
  });

  test("balance and equity follow from the ledger", () => {
    const balance = DEPOSIT + calculateClosedProfit(closed);
    const floating = calculateTotalPnL(account.trades, XAUUSD_BASE_PRICE);
    expect(balance).toBeCloseTo(1800000, 2);
    expect(floating).toBeCloseTo(0, 6);
    expect(balance + floating).toBeCloseTo(1800000, 6);
    expect(account.balance).toBeCloseTo(balance, 2);
    expect(account.equity).toBe(1800000);
  });

  test("every trade is opened and closed in an open session, after the deposit", () => {
    const deposit = Date.parse("2026-02-03T00:00:00Z");
    for (const t of closed) {
      const open = new Date(t.openDate);
      const close = new Date(t.closeDate);
      expect(open.getTime()).toBeGreaterThanOrEqual(deposit);
      expect(close.getTime()).toBeGreaterThan(open.getTime());
      expect(isSymbolOpen(t.symbol, open)).toBe(true);
      expect(isSymbolOpen(t.symbol, close)).toBe(true);
    }
  });

  test("the ledger is chronological and ends before today", () => {
    for (let i = 1; i < closed.length; i++) {
      expect(Date.parse(closed[i].openDate)).toBeGreaterThanOrEqual(
        Date.parse(closed[i - 1].closeDate)
      );
    }
    const last = Date.parse(closed[closed.length - 1].closeDate);
    expect(last).toBeLessThan(Date.now());
  });

  test("stop and target sit on the right side of every entry", () => {
    for (const t of [...closed, ...account.trades]) {
      const sl = t.sl!;
      const tp = t.tp!;
      expect(sl).toBeDefined();
      expect(tp).toBeDefined();
      if (t.type === "BUY") {
        expect(sl).toBeLessThan(t.entryPrice);
        expect(tp).toBeGreaterThan(t.entryPrice);
      } else {
        expect(sl).toBeGreaterThan(t.entryPrice);
        expect(tp).toBeLessThan(t.entryPrice);
      }
    }
  });

  test("a close reason agrees with where the trade actually exited", () => {
    for (const t of closed) {
      // A stop or target fills at its level give or take slippage, never a
      // whole spread beyond the opposite side of the position.
      // Seeded fills draw at most 3 sigma on the fastest tape the model allows.
      const slip = expectedSlippage(t.symbol, t.lot, 3) * 3;
      if (t.closeReason === "SL") {
        expect(Math.abs(t.exitPrice - t.sl!)).toBeLessThanOrEqual(slip);
        expect(calculateClosedTradePnL(t)).toBeLessThan(0);
      }
      if (t.closeReason === "TP") {
        expect(Math.abs(t.exitPrice - t.tp!)).toBeLessThanOrEqual(slip);
        expect(calculateClosedTradePnL(t)).toBeGreaterThan(0);
      }
    }
  });

  test("prices are quoted to the symbol's 2 digits and lots to a 0.01 step", () => {
    for (const t of [...closed, ...account.trades]) {
      for (const p of [t.entryPrice, (t as any).exitPrice, t.sl, t.tp]) {
        if (p === undefined) continue;
        expect(Math.round(p * 100)).toBe(Number((p * 100).toFixed(6)));
      }
      expect(Math.abs(t.lot * 100 - Math.round(t.lot * 100))).toBeLessThan(1e-9);
      expect(t.lot).toBeGreaterThan(0);
    }
  });

  test("no position ever needed more margin than the account had at the time", () => {
    let equity = DEPOSIT;
    for (const t of closed) {
      const margin = calculateMargin(t.symbol, t.lot, t.entryPrice, LEVERAGE);
      // margin level at the moment of opening, in percent
      expect((equity / margin) * 100).toBeGreaterThan(MARGIN_CALL_LEVEL);
      expect(margin / equity).toBeLessThan(0.35);
      equity += calculateClosedTradePnL(t);
    }
    expect(equity).toBeCloseTo(1800000, 2);
  });

  test("the open book sits far above the margin call level", () => {
    const margin = account.trades.reduce(
      (a, t) => a + calculateMargin(t.symbol, t.lot, t.entryPrice, LEVERAGE),
      0
    );
    const equity = 1800000;
    expect((equity / margin) * 100).toBeGreaterThan(500);
  });

  test("the track record is a plausible one", () => {
    const wins = closed.filter((t) => calculateClosedTradePnL(t) > 0);
    const rate = (wins.length / closed.length) * 100;
    expect(closed.length).toBeGreaterThanOrEqual(30);
    expect(rate).toBeGreaterThan(55);
    expect(rate).toBeLessThan(80);

    let equity = DEPOSIT;
    let peak = DEPOSIT;
    let dd = 0;
    for (const t of closed) {
      equity += calculateClosedTradePnL(t);
      peak = Math.max(peak, equity);
      dd = Math.max(dd, (peak - equity) / peak);
    }
    expect(dd).toBeLessThan(0.25);
  });
});
