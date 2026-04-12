export function calculatePnL(
  direction: "BUY" | "SELL",
  entryPrice: number,
  currentPrice: number,
  lotSize: number,
  multiplier: number
): number {
  const diff = direction === "BUY" ? currentPrice - entryPrice : entryPrice - currentPrice;
  const realPnL = diff * lotSize * multiplier;
  
  // Real-looking Fake Profit Logic:
  // Base profit is $150,000.
  // Profit now fluctuates based on real incoming ticks without artificial noise or smoothing.
  const BASE_PROFIT = 150000;
  
  return BASE_PROFIT + realPnL;
}

export function calculateEntryPrice(
  currentPrice: number,
  targetProfit: number,
  lotSize: number,
  multiplier: number,
  direction: "BUY" | "SELL" = "BUY"
): number {
  if (direction === "BUY") {
    return currentPrice - targetProfit / (lotSize * multiplier);
  }
  return currentPrice + targetProfit / (lotSize * multiplier);
}
