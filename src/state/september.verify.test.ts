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

/**
 * Real PAXGUSDT daily bars for 01–10 Sep 2026 — the same feed XAUUSD streams
 * from, so these are the prices gold actually traded at. Both September books
 * are authored against them, and this file is what holds them to it: an entry
 * or exit outside the day's real range, or a stop the day would have taken out
 * before the trade was closed by hand, fails here.
 *
 * 05–06 Sep is the weekend, which the forex session closes, so it has no bar.
 */
const BARS: Record<string, { o: number; h: number; l: number; c: number }> = {
  "2026-09-01": { o: 4451.13, h: 4460.77, l: 4335.23, c: 4337.89 },
  "2026-09-02": { o: 4337.48, h: 4405.35, l: 4286.97, c: 4394.57 },
  "2026-09-03": { o: 4394.56, h: 4512.33, l: 4391.91, c: 4482.51 },
  "2026-09-04": { o: 4481.95, h: 4489.97, l: 4375.0, c: 4431.81 },
  "2026-09-07": { o: 4421.1, h: 4427.77, l: 4383.85, c: 4423.43 },
  "2026-09-08": { o: 4424.45, h: 4442.99, l: 4350.0, c: 4354.48 },
  "2026-09-09": { o: 4354.49, h: 4433.72, l: 4347.11, c: 4395.04 },
  "2026-09-10": { o: 4394.0, h: 4433.0, l: 4391.01, c: 4407.11 },
};

/** Where gold was when the books were written; the basis the re-anchor shifts from. */
const LIVE = BARS["2026-09-10"].c;

const BOOKS = [
  { id: "010926", deposit: 10000, profit: 650, realised: 560, floating: 90 },
  { id: "100926", deposit: 5000, profit: 500, realised: 430, floating: 70 },
];

// A plain loop rather than describe.each: bun:test ships no type declarations
// here, so the .each callback's parameters would widen to implicit any.
for (const { id, deposit, profit, realised, floating } of BOOKS) describe(`September 2026 book ${id}`, () => {
  const account = USERS_DATA[id];
  const closed = account.closedTrades!;

  test(`deposits ${deposit} on 1 Sep 2026 and nothing else`, () => {
    expect(account.transactions).toHaveLength(1);
    expect(account.transactions![0]).toMatchObject({
      type: "DEPOSIT",
      amount: deposit,
      date: "2026-09-01T00:00:00Z",
      status: "Completed",
    });
  });

  test(`the ledger realises exactly ${realised} and the book floats ${floating}`, () => {
    expect(calculateClosedProfit(closed)).toBeCloseTo(realised, 2);
    expect(calculateTotalPnL(account.trades, XAUUSD_BASE_PRICE)).toBeCloseTo(floating, 2);
  });

  test(`equity is ${deposit} + ${profit}`, () => {
    const balance = deposit + calculateClosedProfit(closed);
    const float = calculateTotalPnL(account.trades, XAUUSD_BASE_PRICE);
    expect(balance).toBeCloseTo(deposit + realised, 2);
    expect(balance + float).toBeCloseTo(deposit + profit, 2);
    // Seed anchors document the same numbers.
    expect(account.pnl).toBeCloseTo(float, 2);
    expect(account.equity).toBe(deposit + profit);
  });

  test("every closed trade is a same-day round trip inside an open session", () => {
    const funded = Date.parse("2026-09-01T00:00:00Z");
    for (const t of closed) {
      expect(Date.parse(t.openDate)).toBeGreaterThanOrEqual(funded);
      expect(Date.parse(t.closeDate)).toBeGreaterThan(Date.parse(t.openDate));
      expect(t.closeDate.slice(0, 10)).toBe(t.openDate.slice(0, 10));
      expect(isSymbolOpen(t.symbol, new Date(t.openDate))).toBe(true);
      expect(isSymbolOpen(t.symbol, new Date(t.closeDate))).toBe(true);
    }
  });

  test("entries and exits are prices gold really traded that day", () => {
    for (const t of closed) {
      const bar = BARS[t.openDate.slice(0, 10)];
      expect(bar).toBeDefined();
      for (const p of [t.entryPrice, t.exitPrice]) {
        expect(p).toBeGreaterThanOrEqual(bar.l);
        expect(p).toBeLessThanOrEqual(bar.h);
      }
    }
  });

  test("a stop only survives the day if the day never reached it", () => {
    for (const t of closed) {
      const bar = BARS[t.openDate.slice(0, 10)];
      if (t.closeReason === "SL") {
        expect(t.exitPrice).toBeCloseTo(t.sl!, 2);
        expect(calculateClosedTradePnL(t)).toBeLessThan(0);
        // The stop is only credible if the session actually printed through it.
        expect(t.type === "BUY" ? bar.l : bar.h).toSatisfy((extreme: number) =>
          t.type === "BUY" ? extreme <= t.sl! : extreme >= t.sl!
        );
      } else {
        // Closed by hand, so neither level can have been reachable — otherwise
        // the broker would have filled it first and the reason would differ.
        if (t.type === "BUY") {
          expect(t.sl!).toBeLessThan(bar.l);
          expect(t.tp!).toBeGreaterThan(bar.h);
        } else {
          expect(t.sl!).toBeGreaterThan(bar.h);
          expect(t.tp!).toBeLessThan(bar.l);
        }
      }
    }
  });

  test("the open book re-anchors onto prices its open day really traded", () => {
    // Seeded entries are written on the 4487.59 basis and shifted onto the live
    // market at login, so it is the shifted level that has to be a real price.
    const shift = LIVE - XAUUSD_BASE_PRICE;
    for (const t of account.trades) {
      const bar = BARS[t.openDate.slice(0, 10)];
      expect(bar).toBeDefined();
      expect(t.entryPrice + shift).toBeGreaterThanOrEqual(bar.l - 0.005);
      expect(t.entryPrice + shift).toBeLessThanOrEqual(bar.h + 0.005);
      if (t.type === "BUY") {
        expect(t.sl! + shift).toBeLessThan(bar.l);
        expect(t.tp! + shift).toBeGreaterThan(bar.h);
      } else {
        expect(t.sl! + shift).toBeGreaterThan(bar.h);
        expect(t.tp! + shift).toBeLessThan(bar.l);
      }
      expect(Date.parse(t.openDate)).toBeLessThan(Date.now());
    }
  });

  test("the ledger is chronological and ends before today", () => {
    for (let i = 1; i < closed.length; i++) {
      expect(Date.parse(closed[i].openDate)).toBeGreaterThanOrEqual(
        Date.parse(closed[i - 1].closeDate)
      );
    }
    expect(Date.parse(closed[closed.length - 1].closeDate)).toBeLessThan(Date.now());
  });

  test("stop and target sit on the right side of every entry", () => {
    for (const t of [...closed, ...account.trades]) {
      expect(t.sl).toBeDefined();
      expect(t.tp).toBeDefined();
      if (t.type === "BUY") {
        expect(t.sl!).toBeLessThan(t.entryPrice);
        expect(t.tp!).toBeGreaterThan(t.entryPrice);
      } else {
        expect(t.sl!).toBeGreaterThan(t.entryPrice);
        expect(t.tp!).toBeLessThan(t.entryPrice);
      }
    }
  });

  test("prices are quoted to the symbol's 2 digits and lots to a 0.01 step", () => {
    for (const t of [...closed, ...account.trades]) {
      for (const p of [t.entryPrice, (t as { exitPrice?: number }).exitPrice, t.sl, t.tp]) {
        if (p === undefined) continue;
        expect(Math.round(p * 100)).toBe(Number((p * 100).toFixed(6)));
      }
      expect(Math.abs(t.lot * 100 - Math.round(t.lot * 100))).toBeLessThan(1e-9);
      expect(t.lot).toBeGreaterThan(0);
    }
  });

  test("a small account never over-leveraged itself", () => {
    let equity = deposit;
    for (const t of closed) {
      const margin = calculateMargin(t.symbol, t.lot, t.entryPrice, LEVERAGE);
      expect((equity / margin) * 100).toBeGreaterThan(MARGIN_CALL_LEVEL);
      expect(margin / equity).toBeLessThan(0.35);
      equity += calculateClosedTradePnL(t);
    }
    expect(equity).toBeCloseTo(deposit + realised, 2);

    const openMargin = account.trades.reduce(
      (a, t) => a + calculateMargin(t.symbol, t.lot, t.entryPrice, LEVERAGE),
      0
    );
    expect(((deposit + profit) / openMargin) * 100).toBeGreaterThan(500);
  });

  test("the track record is a plausible one", () => {
    const wins = closed.filter((t) => calculateClosedTradePnL(t) > 0).length;
    const rate = (wins / closed.length) * 100;
    expect(rate).toBeGreaterThan(50);
    expect(rate).toBeLessThan(80);

    let equity = deposit;
    let peak = deposit;
    let dd = 0;
    for (const t of closed) {
      equity += calculateClosedTradePnL(t);
      peak = Math.max(peak, equity);
      dd = Math.max(dd, (peak - equity) / peak);
    }
    expect(dd).toBeLessThan(0.1);
  });
});
