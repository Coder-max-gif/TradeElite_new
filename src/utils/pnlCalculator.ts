import { Trade, ClosedTrade } from "@/state/store.types";

/** Troy ounces per 1.00 lot of XAUUSD. */
export const XAUUSD_CONTRACT_SIZE = 100;

export function calculateTradePnL(trade: Trade, currentPrice: number): number {
  const diff =
    trade.type === "BUY"
      ? currentPrice - trade.entryPrice
      : trade.entryPrice - currentPrice;
  return diff * trade.lot * XAUUSD_CONTRACT_SIZE;
}

export function calculateTotalPnL(trades: Trade[], currentPrice: number): number {
  return trades.reduce((acc, trade) => {
    return acc + calculateTradePnL(trade, currentPrice);
  }, 0);
}

export function calculateClosedTradePnL(trade: ClosedTrade): number {
  const diff =
    trade.type === "BUY"
      ? trade.exitPrice - trade.entryPrice
      : trade.entryPrice - trade.exitPrice;
  return diff * trade.lot * XAUUSD_CONTRACT_SIZE;
}

export function calculateClosedProfit(trades: ClosedTrade[]): number {
  return trades.reduce((acc, trade) => {
    return acc + calculateClosedTradePnL(trade);
  }, 0);
}
