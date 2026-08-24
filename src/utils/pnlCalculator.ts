import { Trade, ClosedTrade } from "@/state/store.types";
import { getSpec } from "@/lib/symbols";

/** Troy ounces per 1.00 lot of XAUUSD. Kept for callers that import it directly. */
export const XAUUSD_CONTRACT_SIZE = 100;

/**
 * Profit of a directional position, expressed in USD.
 *
 * Raw P/L lands in the instrument's quote currency, so a JPY-quoted pair is
 * converted at the same price the leg is valued on.
 */
function pnl(
  symbol: string,
  type: "BUY" | "SELL",
  lot: number,
  entryPrice: number,
  exitPrice: number
): number {
  const spec = getSpec(symbol);
  const diff = type === "BUY" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const raw = diff * lot * spec.contractSize;
  return spec.quoteCurrency === "USD" ? raw : raw / exitPrice;
}

export function calculateTradePnL(trade: Trade, currentPrice: number): number {
  return pnl(trade.symbol, trade.type, trade.lot, trade.entryPrice, currentPrice);
}

/**
 * Floating P/L across the book. `prices` is a per-symbol map; `fallback` values
 * a position whose symbol has not ticked yet at its own entry (zero P/L) rather
 * than against an unrelated instrument's price.
 */
export function calculateTotalPnL(
  trades: Trade[],
  prices: Record<string, number> | number
): number {
  return trades.reduce((acc, trade) => {
    const price =
      typeof prices === "number"
        ? prices
        : prices[getSpec(trade.symbol).id] ?? trade.entryPrice;
    return acc + calculateTradePnL(trade, price);
  }, 0);
}

export function calculateClosedTradePnL(trade: ClosedTrade): number {
  return pnl(trade.symbol, trade.type, trade.lot, trade.entryPrice, trade.exitPrice);
}

export function calculateClosedProfit(trades: ClosedTrade[]): number {
  return trades.reduce((acc, trade) => acc + calculateClosedTradePnL(trade), 0);
}

/**
 * Margin required to hold a position, in USD, at the account's leverage.
 * Notional is valued on the entry price; JPY-quoted pairs convert the same way
 * as P/L does.
 */
export function calculateMargin(
  symbol: string,
  lot: number,
  price: number,
  leverage: number
): number {
  const spec = getSpec(symbol);
  const notional = lot * spec.contractSize * price;
  const usd = spec.quoteCurrency === "USD" ? notional : notional / price;
  return usd / leverage;
}
