import { SYMBOLS, getSpec, type SymbolSpec } from "@/lib/symbols";
import { isOpenAt } from "@/lib/marketHours";
import type { Candle } from "@/lib/indicators/scalperLite";

type PriceListener = (price: number) => void;

/** Kept as a named export because seeded account data is authored against it. */
export const XAUUSD_BASE_PRICE = 4487.59;

const SIM_TICK_MS = 1000;
const REST_POLL_MS = 10_000;
/** Pull toward the anchor price each tick; keeps the walk from drifting away. */
const MEAN_REVERSION = 0.02;

/**
 * Optional live feed for gold and FX. Set VITE_TWELVEDATA_KEY in .env and the
 * simulated instruments switch to real quotes with no other code change.
 */
const TWELVEDATA_KEY: string | undefined = import.meta.env?.VITE_TWELVEDATA_KEY;

const TWELVEDATA_SYMBOLS: Record<string, string> = {
  "OANDA:XAUUSD": "XAU/USD",
  "OANDA:EURUSD": "EUR/USD",
  "OANDA:GBPUSD": "GBP/USD",
  "OANDA:USDJPY": "USD/JPY",
};

/** Ticks kept per engine for the realised-volatility estimate. */
const VOL_WINDOW = 30;

interface Engine {
  spec: SymbolSpec;
  listeners: Set<PriceListener>;
  price: number;
  socket: WebSocket | null;
  timers: ReturnType<typeof setInterval>[];
  closedByUs: boolean;
  /** Rolling window of recent prices, oldest first. */
  recent: number[];
}

const engines = new Map<string, Engine>();

/** Box-Muller normal sample; a flat uniform walk looks visibly synthetic. */
function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function broadcast(engine: Engine, price: number, force = false) {
  if (!Number.isFinite(price) || price <= 0) return;
  // `force` is for the one-off REST seed, so a page opened mid-weekend still
  // knows the last traded price even though the session is shut.
  if (!force && !isOpenAt(engine.spec.tradingHours)) return;
  engine.price = price;
  engine.recent.push(price);
  if (engine.recent.length > VOL_WINDOW) engine.recent.shift();
  engine.listeners.forEach((listener) => listener(price));
}

// --- Live feeds -------------------------------------------------------------

function connectBinance(engine: Engine) {
  const feed = engine.spec.feed;
  if (feed.kind !== "binance") return;

  const socket = new WebSocket(`wss://stream.binance.com:9443/ws/${feed.stream}`);
  engine.socket = socket;
  engine.closedByUs = false;

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data?.p) broadcast(engine, parseFloat(data.p));
  };

  socket.onclose = () => {
    // Only reconnect while somebody is still watching this symbol.
    if (!engine.closedByUs && engine.listeners.size > 0) {
      setTimeout(() => {
        if (!engine.closedByUs && engine.listeners.size > 0) connectBinance(engine);
      }, 2000);
    }
  };

  socket.onerror = () => socket.close();
}

async function fetchTwelveDataQuote(engine: Engine): Promise<void> {
  const td = TWELVEDATA_SYMBOLS[engine.spec.id];
  if (!TWELVEDATA_KEY || !td) return;
  if (!isOpenAt(engine.spec.tradingHours)) return;
  try {
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(td)}&apikey=${TWELVEDATA_KEY}`
    );
    const json = await res.json();
    const price = parseFloat(json?.price);
    if (Number.isFinite(price) && price > 0) broadcast(engine, price);
  } catch {
    /* leave the simulated walk in charge until the next poll */
  }
}

/**
 * Mean-reverting walk around the spec's anchor. Unlike a pure random walk this
 * stays near the authored price level, so seeded positions keep showing the
 * P/L they were written to show.
 */
function simulatedTick(engine: Engine) {
  const feed = engine.spec.feed;
  if (feed.kind !== "simulated") return;
  // Outside the session broadcast() drops the quote, so the last price stands
  // and both P/L and the chart hold still until the market reopens.
  const drift = (feed.basePrice - engine.price) * MEAN_REVERSION;
  broadcast(engine, engine.price + drift + gauss() * feed.volatility);
}

async function seedBinancePrice(engine: Engine) {
  const feed = engine.spec.feed;
  if (feed.kind !== "binance") return;
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${feed.restSymbol}`
    );
    const json = await res.json();
    const price = parseFloat(json?.price);
    if (Number.isFinite(price) && price > 0 && engine.price <= 0) {
      broadcast(engine, price, true);
    }
  } catch {
    /* the websocket will supply a price once the session opens */
  }
}

function startEngine(engine: Engine) {
  if (engine.spec.feed.kind === "binance") {
    void seedBinancePrice(engine);
    connectBinance(engine);
    return;
  }

  const live = Boolean(TWELVEDATA_KEY && TWELVEDATA_SYMBOLS[engine.spec.id]);
  if (live) {
    // Real quotes arrive slowly on the free tier, so the simulated walk keeps
    // ticking between polls and every poll snaps it back to the true price.
    void fetchTwelveDataQuote(engine);
    engine.timers.push(setInterval(() => void fetchTwelveDataQuote(engine), REST_POLL_MS));
  }

  simulatedTick(engine);
  engine.timers.push(setInterval(() => simulatedTick(engine), SIM_TICK_MS));
}

function stopEngine(engine: Engine) {
  engine.closedByUs = true;
  if (engine.socket) {
    engine.socket.close();
    engine.socket = null;
  }
  engine.timers.forEach(clearInterval);
  engine.timers = [];
}

function getEngine(symbol: string): Engine {
  const spec = getSpec(symbol);
  let engine = engines.get(spec.id);
  if (!engine) {
    engine = {
      spec,
      listeners: new Set(),
      price: spec.feed.kind === "simulated" ? spec.feed.basePrice : 0,
      socket: null,
      timers: [],
      closedByUs: false,
      recent: [],
    };
    engines.set(spec.id, engine);
  }
  return engine;
}

/**
 * Subscribe to one instrument. Engines are per-symbol and shared, so several
 * widgets watching the same symbol see byte-identical ticks, and watching a
 * second symbol never disturbs the first.
 */
export function subscribeToPrice(symbol: string, callback: PriceListener) {
  const engine = getEngine(symbol);
  const wasIdle = engine.listeners.size === 0;
  engine.listeners.add(callback);

  if (wasIdle) startEngine(engine);
  // Late subscriber syncs immediately instead of waiting for the next tick.
  if (engine.price > 0) callback(engine.price);

  return () => {
    engine.listeners.delete(callback);
    if (engine.listeners.size === 0) stopEngine(engine);
  };
}

export function getPrice(symbol: string): number {
  const spec = getSpec(symbol);
  const engine = engines.get(spec.id);
  if (engine && engine.price > 0) return engine.price;
  return spec.feed.kind === "simulated" ? spec.feed.basePrice : 0;
}

/**
 * Realised volatility of the recent tape, as the standard deviation of
 * tick-to-tick returns. Returned relative to the instrument's own typical
 * movement so callers get a plain multiplier: 1 is a normal tape, 2 is twice as
 * fast as usual. Falls back to 1 before enough ticks have accumulated.
 */
export function volatilityMultiplier(symbol: string): number {
  const spec = getSpec(symbol);
  const engine = engines.get(spec.id);
  if (!engine || engine.recent.length < 5) return 1;

  const returns: number[] = [];
  for (let i = 1; i < engine.recent.length; i++) {
    const previous = engine.recent[i - 1];
    if (previous > 0) returns.push((engine.recent[i] - previous) / previous);
  }
  if (returns.length < 4) return 1;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (returns.length - 1);
  const sigma = Math.sqrt(variance);

  // Baseline: the per-tick move an instrument shows on an ordinary tape,
  // expressed as a fraction of price. Half a basis point is typical.
  const BASELINE = 0.00005;
  return sigma / BASELINE;
}

/** Every tradable instrument, for callers that want to warm all engines. */
export function allSymbols() {
  return SYMBOLS;
}

// --- Historical candles -----------------------------------------------------

async function fetchBinanceHistory(
  spec: SymbolSpec,
  intervalSec: number,
  limit: number
): Promise<Candle[] | null> {
  if (spec.feed.kind !== "binance") return null;
  const { restSymbol } = spec.feed;
  const interval = intervalSec >= 3600 ? "1h" : intervalSec >= 300 ? "5m" : "1m";
  const weekendFiltered = spec.tradingHours !== "24/7";

  // Binance caps one response at 1000 bars, so walk backwards through pages
  // until enough tradable candles have been collected. Weekend bars are dropped
  // for instruments that do not trade then, which is why the raw count needed
  // can exceed the requested count.
  const PAGE = 1000;
  const MAX_PAGES = 10;
  const byTime = new Map<number, Candle>();
  let endTime: number | undefined;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const url =
        `https://api.binance.com/api/v3/klines?symbol=${restSymbol}` +
        `&interval=${interval}&limit=${PAGE}` +
        (endTime === undefined ? "" : `&endTime=${endTime}`);

      const res = await fetch(url);
      if (!res.ok) break;
      const rows = (await res.json()) as unknown[][];
      if (!Array.isArray(rows) || rows.length === 0) break;

      let oldest = Infinity;
      for (const r of rows) {
        const time = Math.floor(Number(r[0]) / 1000);
        if (time < oldest) oldest = time;
        byTime.set(time, {
          time,
          open: parseFloat(String(r[1])),
          high: parseFloat(String(r[2])),
          low: parseFloat(String(r[3])),
          close: parseFloat(String(r[4])),
        });
      }

      const usable = weekendFiltered
        ? [...byTime.keys()].filter((t) => isOpenAt(spec.tradingHours, new Date(t * 1000))).length
        : byTime.size;
      if (usable >= limit) break;

      endTime = oldest * 1000 - 1;
    }
  } catch {
    if (byTime.size === 0) return null;
  }

  if (byTime.size === 0) return null;

  const candles = [...byTime.values()].sort((a, b) => a.time - b.time);
  const tradable = weekendFiltered
    ? candles.filter((c) => isOpenAt(spec.tradingHours, new Date(c.time * 1000)))
    : candles;
  return tradable.slice(-limit);
}

async function fetchTwelveDataHistory(
  spec: SymbolSpec,
  limit: number
): Promise<Candle[] | null> {
  const td = TWELVEDATA_SYMBOLS[spec.id];
  if (!TWELVEDATA_KEY || !td) return null;
  try {
    const res = await fetch(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(td)}` +
        `&interval=1min&outputsize=${limit}&apikey=${TWELVEDATA_KEY}`
    );
    const json = await res.json();
    if (!Array.isArray(json?.values)) return null;
    return json.values
      .map((v: Record<string, string>) => ({
        time: Math.floor(new Date(v.datetime.replace(" ", "T") + "Z").getTime() / 1000),
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
      }))
      .reverse(); // Twelve Data returns newest-first.
  } catch {
    return null;
  }
}

/**
 * Synthetic history whose final close lands exactly on the anchor price, so the
 * generated candles join the live walk without a visible seam.
 */
function simulatedHistory(spec: SymbolSpec, intervalSec: number, limit: number): Candle[] {
  // History uses its own, larger step: the live price may be pinned to protect
  // seeded P/L, but the chart behind it should still show a realistic range.
  const volatility =
    spec.feed.kind === "simulated" ? spec.feed.historyVolatility : getPrice(spec.id) * 0.0002 || 1;
  const anchor =
    spec.feed.kind === "simulated" ? spec.feed.basePrice : getPrice(spec.id) || 100;
  // Walk backwards over tradable buckets only, so a closed session leaves a
  // real gap in the series instead of a run of invented weekend candles.
  const now = Math.floor(Date.now() / 1000);
  const times: number[] = [];
  let cursor = now - (now % intervalSec);
  while (times.length < limit) {
    if (isOpenAt(spec.tradingHours, new Date(cursor * 1000))) times.push(cursor);
    cursor -= intervalSec;
  }
  times.reverse();

  // A real candle is the summary of the path price actually took inside the
  // bar, so the path is simulated and then reduced to OHLC. Bolting a random
  // wick onto a body — the previous approach — produces the all-spike, no-body
  // shapes that read instantly as fake.
  const STEPS_PER_CANDLE = 24;
  const stepSigma = volatility / Math.sqrt(STEPS_PER_CANDLE);

  // Two slow processes give the tape its character:
  //   volFactor  — volatility clustering: quiet stretches, then bursts.
  //   momentum   — trend regimes, so the series pushes in one direction for a
  //                while instead of oscillating around the anchor forever.
  let volFactor = 1;
  let momentum = 0;
  let price = anchor;

  const raw: Candle[] = [];
  for (let i = 0; i < times.length; i++) {
    volFactor = Math.min(2.6, Math.max(0.35, volFactor * Math.exp(0.13 * gauss() - 0.008)));
    // Momentum decays and is nudged, with a weak pull back toward the anchor so
    // a long trend cannot wander off and flatten the visible price scale.
    momentum = momentum * 0.93 + gauss() * volatility * 0.07 + (anchor - price) * 0.001;

    const open = price;
    let high = open;
    let low = open;
    for (let step = 0; step < STEPS_PER_CANDLE; step++) {
      price += momentum / STEPS_PER_CANDLE + gauss() * stepSigma * volFactor;
      if (price > high) high = price;
      if (price < low) low = price;
    }

    raw.push({ time: times[i], open, high, low, close: price });
  }

  // Land the final close exactly on the anchor so the generated history joins
  // the live price with no visible seam.
  const shift = anchor - raw[raw.length - 1].close;
  return raw.map((c) => ({
    time: c.time,
    open: c.open + shift,
    high: c.high + shift,
    low: c.low + shift,
    close: c.close + shift,
  }));
}

/**
 * Candles for the chart. Real data is used wherever a provider is available and
 * falls back to the simulated series when the network or key is missing, so the
 * chart always renders something.
 */
export async function fetchHistory(
  symbol: string,
  intervalSec = 60,
  limit = 300
): Promise<Candle[]> {
  const spec = getSpec(symbol);
  const real =
    (await fetchBinanceHistory(spec, intervalSec, limit)) ??
    (await fetchTwelveDataHistory(spec, limit));
  return real && real.length > 0 ? real : simulatedHistory(spec, intervalSec, limit);
}

/** True when this instrument is showing genuine market data. */
export function isLiveFeed(symbol: string): boolean {
  const spec = getSpec(symbol);
  if (spec.feed.kind === "binance") return true;
  return Boolean(TWELVEDATA_KEY && TWELVEDATA_SYMBOLS[spec.id]);
}
