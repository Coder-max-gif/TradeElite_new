import { Trade } from "@/state/store.types";

export function calculateTradePnL(trade: Trade, currentPrice: number): number {
  const diff =
    trade.type === "BUY"
      ? currentPrice - trade.entryPrice
      : trade.entryPrice - currentPrice;
  return diff * trade.lot * 100;
}

export function calculateTotalPnL(trades: Trade[], currentPrice: number): number {
  return trades.reduce((acc, trade) => {
    return acc + calculateTradePnL(trade, currentPrice);
  }, 0);
}
