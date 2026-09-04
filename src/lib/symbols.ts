import { isOpenAt, marketStatus, type TradingHours } from "./marketHours";

/**
 * Instrument specifications — the simulator's equivalent of the MT5
 * "Symbol Properties" dialog. Every P/L, spread and price-formatting decision
 * in the app resolves through this table, so adding an instrument here is
 * enough to make it fully tradable.
 */

export type Feed =
  | {
      kind: "binance";
      stream: string;
      restSymbol: string;
      /**
       * Step of the bridging walk that keeps the quote alive while the real
       * tape is silent, in price units. Gold trades as PAXG, which prints only
       * a handful of times a minute, so without this the price — and with it
       * every open position and the order ticket — sits frozen for tens of
       * seconds while the chart looks alive. Omit on instruments that print
       * often enough never to go quiet.
       */
      quietStep?: number;
    }
  | {
      kind: "simulated";
      basePrice: number;
      /**
       * Per-tick step of the live price. Kept small on instruments that carry
       * seeded positions: those entry prices are authored so that floating P/L
       * equals the account's stated profit while price sits on basePrice, and a
       * wide live walk would drift those figures away from the intended numbers.
       */
      volatility: number;
      /**
       * Per-candle step used to generate historical bars. Independent of the
       * live step so the chart still shows a full, realistic range even when
       * the current price is deliberately pinned.
       */
      historyVolatility: number;
    };

export interface SymbolSpec {
  /** Canonical id used by the router, market watch and price engine. */
  id: string;
  /** Short form stored on trades and shown in tables. */
  display: string;
  name: string;
  /** Units of the base asset per 1.00 lot. */
  contractSize: number;
  digits: number;
  /** Full spread in price units; half is applied to each side of the mid. */
  spread: number;
  /** Quote currency decides whether raw P/L is already in USD. */
  quoteCurrency: "USD" | "JPY";
  /** Session this instrument follows. Forex and gold shut over the weekend. */
  tradingHours: TradingHours;
  /** Candle size the chart draws for this instrument, in seconds. */
  chartInterval: number;
  feed: Feed;
}

export const SYMBOLS: SymbolSpec[] = [
  {
    id: "OANDA:XAUUSD",
    display: "XAUUSD",
    name: "Gold",
    contractSize: 100,
    digits: 2,
    spread: 0.3,
    quoteCurrency: "USD",
    tradingHours: "forex",
    // 5-minute candles: PAXG prints only ~12 trades a minute, so a 1-minute
    // chart is a third empty bars, while 5m is dense and well formed.
    chartInterval: 300,
    // bookTicker, not @trade: PAXG's best bid/ask moves constantly while actual
    // trades print roughly once a minute, so the book is the far livelier tape.
    feed: {
      kind: "binance",
      stream: "paxgusdt@bookTicker",
      restSymbol: "PAXGUSDT",
      quietStep: 0.05,
    },
  },
  {
    id: "BITSTAMP:BTCUSD",
    display: "BTCUSD",
    name: "Bitcoin",
    contractSize: 1,
    digits: 2,
    spread: 12,
    chartInterval: 60,
    quoteCurrency: "USD",
    tradingHours: "24/7",
    feed: { kind: "binance", stream: "btcusdt@trade", restSymbol: "BTCUSDT" },
  },
  {
    id: "BINANCE:ETHUSD",
    display: "ETHUSD",
    name: "Ethereum",
    contractSize: 1,
    digits: 2,
    spread: 1.5,
    chartInterval: 60,
    quoteCurrency: "USD",
    tradingHours: "24/7",
    feed: { kind: "binance", stream: "ethusdt@trade", restSymbol: "ETHUSDT" },
  },
  {
    id: "OANDA:EURUSD",
    display: "EURUSD",
    name: "Euro/Dollar",
    contractSize: 100000,
    digits: 5,
    spread: 0.0001,
    chartInterval: 60,
    quoteCurrency: "USD",
    tradingHours: "forex",
    feed: {
      kind: "simulated",
      basePrice: 1.0872,
      volatility: 0.000008,
      historyVolatility: 0.00009,
    },
  },
  {
    id: "OANDA:GBPUSD",
    display: "GBPUSD",
    name: "Pound/Dollar",
    contractSize: 100000,
    digits: 5,
    spread: 0.00015,
    chartInterval: 60,
    quoteCurrency: "USD",
    tradingHours: "forex",
    feed: {
      kind: "simulated",
      basePrice: 1.2715,
      volatility: 0.00001,
      historyVolatility: 0.000115,
    },
  },
  {
    id: "OANDA:USDJPY",
    display: "USDJPY",
    name: "Dollar/Yen",
    contractSize: 100000,
    digits: 3,
    spread: 0.015,
    chartInterval: 60,
    quoteCurrency: "JPY",
    tradingHours: "forex",
    feed: {
      kind: "simulated",
      basePrice: 154.85,
      volatility: 0.001,
      historyVolatility: 0.0115,
    },
  },
];

const BY_KEY = new Map<string, SymbolSpec>();
for (const spec of SYMBOLS) {
  BY_KEY.set(spec.id, spec);
  BY_KEY.set(spec.display, spec);
}

export const DEFAULT_SYMBOL = SYMBOLS[0];

/**
 * Broker volume limits, in lots — the MT5 "Volume min / Volume step" fields.
 * How much size an account can actually carry is a margin question, answered
 * separately when the order is priced.
 */
export const MIN_LOT = 0.01;
export const LOT_STEP = 0.01;

/** Round a requested volume down onto the dealable step. */
export function normalizeLot(lot: number): number {
  // Snapped back through toFixed: multiplying a step count by 0.01 in binary
  // floating point lands on values like 0.15000000000000002 otherwise.
  return Number((Math.round(lot / LOT_STEP) * LOT_STEP).toFixed(2));
}

/**
 * Accepts either form a trade might carry ("XAUUSD" from the seeded ledger or
 * "OANDA:XAUUSD" from the market watch) and never returns undefined, so P/L
 * math downstream stays total.
 */
export function getSpec(symbol: string): SymbolSpec {
  return BY_KEY.get(symbol) ?? DEFAULT_SYMBOL;
}

export function formatSymbolPrice(symbol: string, price: number): string {
  return price.toFixed(getSpec(symbol).digits);
}

/** Price a market BUY fills at. */
export function askPrice(symbol: string, mid: number): number {
  return mid + getSpec(symbol).spread / 2;
}

/** Price a market SELL fills at. */
export function bidPrice(symbol: string, mid: number): number {
  return mid - getSpec(symbol).spread / 2;
}

/** Whether this instrument is currently tradable. */
export function isSymbolOpen(symbol: string, at: Date = new Date()): boolean {
  return isOpenAt(getSpec(symbol).tradingHours, at);
}

export function symbolStatus(symbol: string, at: Date = new Date()) {
  return marketStatus(getSpec(symbol).tradingHours, at);
}
