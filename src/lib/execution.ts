import { getSpec, askPrice, bidPrice } from "./symbols";

/**
 * Order execution model.
 *
 * A market order does not fill at the quote on screen. It crosses the spread,
 * then slips further because the order consumes depth and because the price
 * moves between the click and the fill. This module carries that arithmetic so
 * the store, the order ticket and any preview all agree on one set of numbers.
 */

/** Lot size at which size-impact equals one unit. */
const REFERENCE_LOT = 1.0;
/** Slippage at the reference lot, as a fraction of the half-spread. */
const SLIPPAGE_BASE = 0.6;
/** Share of fills that go against the trader; the rest get price improvement. */
const ADVERSE_PROBABILITY = 0.75;
/** Bounds on the volatility multiplier, so a quiet or wild tape stays sane. */
const VOL_MULTIPLIER_MIN = 0.5;
const VOL_MULTIPLIER_MAX = 3;

function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Expected slippage magnitude in price units, before direction.
 *
 * Size enters as a square root — the standard market-impact law, where impact
 * grows with the square root of order size rather than linearly, because a
 * larger order walks progressively deeper into the book.
 *
 * `volatilityMultiplier` scales that by how fast the market is currently
 * moving: the same order slips further in a fast tape than a quiet one.
 */
export function expectedSlippage(
  symbol: string,
  lot: number,
  volatilityMultiplier = 1
): number {
  const spec = getSpec(symbol);
  const halfSpread = spec.spread / 2;
  const sizeImpact = Math.sqrt(Math.max(lot, 0) / REFERENCE_LOT);
  const vol = Math.min(
    VOL_MULTIPLIER_MAX,
    Math.max(VOL_MULTIPLIER_MIN, volatilityMultiplier)
  );
  return halfSpread * SLIPPAGE_BASE * sizeImpact * vol;
}

/**
 * One realised draw of slippage, in price units. Positive means the fill is
 * worse for the trader; negative is price improvement.
 */
export function drawSlippage(
  symbol: string,
  lot: number,
  volatilityMultiplier = 1
): number {
  const scale = expectedSlippage(symbol, lot, volatilityMultiplier);
  // Half-normal magnitude: usually small, occasionally a bad fill.
  const magnitude = Math.abs(gauss()) * scale;
  const adverse = Math.random() < ADVERSE_PROBABILITY ? 1 : -1;
  return magnitude * adverse;
}

export interface Fill {
  /** Price the order actually filled at. */
  price: number;
  /** Mid-market quote at the moment of the order. */
  mid: number;
  /** Quote the order crossed to: ask for a buy, bid for a sell. */
  quote: number;
  /** Signed slippage applied on top of the quote, in price units. */
  slippage: number;
}

/**
 * Fill a market order.
 *
 * A buy lifts the ask and slips upward; a sell hits the bid and slips downward.
 * In both cases positive slippage means a worse price for the trader.
 */
export function fillMarketOrder(
  symbol: string,
  side: "BUY" | "SELL",
  lot: number,
  mid: number,
  volatilityMultiplier = 1
): Fill {
  const spec = getSpec(symbol);
  const quote = side === "BUY" ? askPrice(spec.id, mid) : bidPrice(spec.id, mid);
  const slippage = drawSlippage(spec.id, lot, volatilityMultiplier);
  const price = side === "BUY" ? quote + slippage : quote - slippage;

  // A fill can never be at or through zero, whatever the draw.
  return { price: Math.max(price, spec.spread), mid, quote, slippage };
}

/**
 * Fill the closing side of an existing position: a long closes by selling into
 * the bid, a short closes by buying back at the ask.
 */
export function fillCloseOrder(
  symbol: string,
  side: "BUY" | "SELL",
  lot: number,
  mid: number,
  volatilityMultiplier = 1
): Fill {
  return fillMarketOrder(symbol, side === "BUY" ? "SELL" : "BUY", lot, mid, volatilityMultiplier);
}
