import { describe, expect, test } from "bun:test";
import { USERS_DATA } from "./store";

describe("account seed data", () => {
  test("uses a three-buy, one-sell profile for the main trading account", () => {
    const account = USERS_DATA["140830"];

    expect(account.balance).toBe(250000);
    expect(account.pnl).toBe(15000);
    expect(account.equity).toBe(1668000);
    expect(account.initialDepositAmount).toBe(250000);

    const buyTrades = account.trades.filter((trade) => trade.type === "BUY");
    const sellTrades = account.trades.filter((trade) => trade.type === "SELL");

    expect(buyTrades).toHaveLength(3);
    expect(sellTrades).toHaveLength(1);
    expect(buyTrades.reduce((sum, trade) => sum + trade.lot, 0)).toBeCloseTo(6.5);
  });
});
