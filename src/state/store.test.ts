import { describe, expect, test } from "bun:test";
import { USERS_DATA } from "./store";

describe("account seed data", () => {
  test("uses a two-buy, no-sell profile for the main trading account", () => {
    const account = USERS_DATA["140830"];

    expect(account.balance).toBe(3000);
    expect(account.pnl).toBe(7500);
    expect(account.equity).toBe(10500);
    expect(account.initialDepositAmount).toBe(3000);

    const buyTrades = account.trades.filter((trade) => trade.type === "BUY");
    const sellTrades = account.trades.filter((trade) => trade.type === "SELL");

    expect(buyTrades).toHaveLength(2);
    expect(sellTrades).toHaveLength(0);
    expect(buyTrades.reduce((sum, trade) => sum + trade.lot, 0)).toBeCloseTo(2.25);
  });
});
