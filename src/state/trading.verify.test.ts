import { describe, expect, test } from "bun:test";
import { normalizeLot, MIN_LOT, getSpec, askPrice, bidPrice } from "@/lib/symbols";
import { calculateMargin, calculateTradePnL, calculateClosedTradePnL } from "@/utils/pnlCalculator";
import { fillMarketOrder, fillCloseOrder } from "@/lib/execution";
import type { Trade, ClosedTrade } from "./store.types";

const LEVERAGE = 100;
const SYMBOL = "OANDA:XAUUSD";
const spec = getSpec(SYMBOL);

describe("volume normalisation", () => {
  test("snaps a typed volume onto the dealable step with no float dust", () => {
    expect(normalizeLot(0.153)).toBe(0.15);
    expect(normalizeLot(2.5)).toBe(2.5);
    expect(normalizeLot(0.07)).toBe(0.07);
    // the case a naive step-count multiplication gets wrong
    expect(String(normalizeLot(0.15))).toBe("0.15");
    expect(String(normalizeLot(12.34))).toBe("12.34");
  });

  test("the minimum is itself a whole number of steps", () => {
    expect(normalizeLot(MIN_LOT)).toBe(MIN_LOT);
  });
});

describe("a round trip at the user's own lot size", () => {
  test("P/L scales linearly with the lot size chosen", () => {
    for (const lot of [0.01, 0.5, 3.25, 40]) {
      const t: Trade = {
        id: "t", type: "BUY", lot, entryPrice: 4400, symbol: "XAUUSD",
        openDate: new Date().toISOString(),
      };
      // ten dollars of gold, on `lot` lots of 100 oz
      expect(calculateTradePnL(t, 4410)).toBeCloseTo(10 * lot * 100, 6);
    }
  });

  test("a buy that closes higher books a profit, a sell books a loss", () => {
    const mk = (type: "BUY" | "SELL"): ClosedTrade => {
      const entry = fillMarketOrder(SYMBOL, type, 2.5, 4400, 1);
      const exit = fillCloseOrder(SYMBOL, type, 2.5, 4450, 1);
      return {
        id: "t", type, lot: 2.5, entryPrice: entry.price, exitPrice: exit.price,
        symbol: "XAUUSD", openDate: "", closeDate: "", closeReason: "MANUAL",
      };
    };
    expect(calculateClosedTradePnL(mk("BUY"))).toBeGreaterThan(0);
    expect(calculateClosedTradePnL(mk("SELL"))).toBeLessThan(0);
  });

  test("both legs of a round trip pay the spread", () => {
    const mid = 4400;
    const buy = fillMarketOrder(SYMBOL, "BUY", 1, mid, 1);
    const sellToClose = fillCloseOrder(SYMBOL, "BUY", 1, mid, 1);
    expect(buy.quote).toBeCloseTo(askPrice(SYMBOL, mid), 10);
    expect(sellToClose.quote).toBeCloseTo(bidPrice(SYMBOL, mid), 10);
    // closing at the mid it opened on can never be profitable
    expect(sellToClose.quote).toBeLessThan(buy.quote);
  });

  test("margin held is the notional at the account's leverage", () => {
    const lot = 12.5;
    const price = 4487.59;
    const margin = calculateMargin(SYMBOL, lot, price, LEVERAGE);
    expect(margin).toBeCloseTo((lot * spec.contractSize * price) / LEVERAGE, 6);
    expect(calculateMargin(SYMBOL, lot * 2, price, LEVERAGE)).toBeCloseTo(margin * 2, 6);
  });
});

describe("stop and target sides", () => {
  // The rule openTrade and modifyTrade both enforce, checked against the quote
  // the position would actually close on.
  const okSl = (type: "BUY" | "SELL", sl: number, exit: number) =>
    type === "BUY" ? sl < exit : sl > exit;
  const okTp = (type: "BUY" | "SELL", tp: number, exit: number) =>
    type === "BUY" ? tp > exit : tp < exit;

  test("a long's stop sits below the bid and its target above", () => {
    const exit = bidPrice(SYMBOL, 4487.59);
    expect(okSl("BUY", 4450, exit)).toBe(true);
    expect(okSl("BUY", 4500, exit)).toBe(false);
    expect(okTp("BUY", 4520, exit)).toBe(true);
    expect(okTp("BUY", 4450, exit)).toBe(false);
  });

  test("a short's stop sits above the ask and its target below", () => {
    const exit = askPrice(SYMBOL, 4487.59);
    expect(okSl("SELL", 4520, exit)).toBe(true);
    expect(okSl("SELL", 4450, exit)).toBe(false);
    expect(okTp("SELL", 4450, exit)).toBe(true);
    expect(okTp("SELL", 4520, exit)).toBe(false);
  });

  test("a level exactly on the closing quote is rejected", () => {
    const exit = bidPrice(SYMBOL, 4487.59);
    expect(okSl("BUY", exit, exit)).toBe(false);
    expect(okTp("BUY", exit, exit)).toBe(false);
  });
});

describe("balance, equity and history after a close", () => {
  test("realised P/L moves balance and the trade lands in history", () => {
    let balance = 1800000;
    const closed: ClosedTrade[] = [];
    const trade: Trade = {
      id: "t", type: "BUY", lot: 5, entryPrice: 4400, symbol: "XAUUSD", openDate: "",
    };
    const exitPrice = 4425;
    const profit = calculateTradePnL(trade, exitPrice);

    closed.unshift({ ...trade, exitPrice, closeDate: "", closeReason: "MANUAL" });
    balance += profit;

    expect(profit).toBeCloseTo(25 * 5 * 100, 6);
    expect(balance).toBeCloseTo(1812500, 6);
    expect(closed).toHaveLength(1);
    expect(calculateClosedTradePnL(closed[0])).toBeCloseTo(profit, 6);
  });

  test("equity is balance plus floating, and margin frees up on close", () => {
    const balance = 1800000;
    const open: Trade[] = [
      { id: "a", type: "BUY", lot: 10, entryPrice: 4400, symbol: "XAUUSD", openDate: "" },
      { id: "b", type: "SELL", lot: 4, entryPrice: 4500, symbol: "XAUUSD", openDate: "" },
    ];
    const price = 4450;
    const floating = open.reduce((a, t) => a + calculateTradePnL(t, price), 0);
    const margin = open.reduce(
      (a, t) => a + calculateMargin(t.symbol, t.lot, t.entryPrice, LEVERAGE), 0
    );

    expect(floating).toBeCloseTo(50 * 10 * 100 + 50 * 4 * 100, 6);
    expect(balance + floating).toBeCloseTo(1870000, 6);
    expect(margin).toBeCloseTo(((10 * 4400 + 4 * 4500) * 100) / LEVERAGE, 6);

    // closing the long releases its margin and leaves the short's behind
    const after = open.filter((t) => t.id !== "a");
    const marginAfter = after.reduce(
      (a, t) => a + calculateMargin(t.symbol, t.lot, t.entryPrice, LEVERAGE), 0
    );
    expect(marginAfter).toBeCloseTo((4 * 4500 * 100) / LEVERAGE, 6);
    expect(marginAfter).toBeLessThan(margin);
  });
});

describe("history ordering", () => {
  test("newest first, however the book was assembled", () => {
    const mk = (id: string, closeDate: string): ClosedTrade => ({
      id, type: "BUY", lot: 1, entryPrice: 4400, exitPrice: 4410,
      symbol: "XAUUSD", openDate: closeDate, closeDate,
    });
    // a seeded book runs oldest-first; a live close is prepended
    const book = [
      mk("live", "2026-08-24T10:00:00Z"),
      mk("feb", "2026-02-10T10:00:00Z"),
      mk("aug", "2026-08-20T10:00:00Z"),
    ];
    const sorted = [...book].sort((a, b) => Date.parse(b.closeDate) - Date.parse(a.closeDate));
    expect(sorted.map((t) => t.id).join(",")).toBe("live,aug,feb");
  });
});
