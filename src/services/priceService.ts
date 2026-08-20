type PriceListener = (price: number) => void;

/** Single source of truth for the simulated XAUUSD market level. */
export const XAUUSD_BASE_PRICE = 4487.59;

const POLL_INTERVAL_MS = 1500;
const MICRO_NOISE_RANGE = 0.15; // +/- 0.075

const listeners: Set<PriceListener> = new Set();
let socket: WebSocket | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let activeSymbol: string | null = null;
let currentPrice = 0;

/**
 * Every subscriber receives the exact same tick value so all widgets
 * update from one calculation cycle.
 */
function broadcast(price: number) {
  currentPrice = price;
  listeners.forEach((listener) => listener(price));
}

/**
 * REST Fallback for Gold and Forex
 */
async function fetchRestPrice(symbol: string): Promise<number> {
  if (symbol.includes("XAUUSD")) {
    // Use a fixed price level that matches the seeded open positions.
    return XAUUSD_BASE_PRICE;
  }

  // Generic fallback for other symbols - return static values to avoid fetch errors
  const bases: Record<string, number> = {
    "OANDA:XAUUSD": XAUUSD_BASE_PRICE,
    "OANDA:EURUSD": 1.0872,
    "NASDAQ:NDX": 18245.30,
    "OANDA:GBPUSD": 1.2715,
    "OANDA:USDJPY": 154.85
  };
  return bases[symbol] || 0;
}

/**
 * Connect to Binance WebSocket for real-time BTCUSD
 */
function connectBinance() {
  if (socket) socket.close();

  socket = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@trade");

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data && data.p) {
      broadcast(parseFloat(data.p));
    }
  };

  socket.onclose = () => {
    if (listeners.size > 0 && activeSymbol?.includes("BTCUSD")) {
      console.log("WebSocket closed, retrying in 2s...");
      setTimeout(() => {
        if (listeners.size > 0 && activeSymbol?.includes("BTCUSD")) connectBinance();
      }, 2000);
    }
  };

  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
    socket?.close();
  };
}

function stopEngine() {
  if (socket) {
    socket.close();
    socket = null;
  }
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  activeSymbol = null;
}

function startEngine(symbol: string) {
  stopEngine();
  activeSymbol = symbol;

  if (symbol.includes("BTCUSD")) {
    connectBinance();
    return;
  }

  // REST polling fallback (1-2s interval) for non-websocket symbols
  const poll = async () => {
    const price = await fetchRestPrice(symbol);
    if (price > 0) {
      // Add tiny micro-fluctuations (noise) to make the PnL look alive,
      // as REST APIs often cache the price for several seconds or minutes.
      // Sampled once per tick so every subscriber sees the identical price.
      const microNoise = (Math.random() - 0.5) * MICRO_NOISE_RANGE;
      broadcast(price + microNoise);
    }
  };
  poll();
  pollInterval = setInterval(poll, POLL_INTERVAL_MS);
}

/**
 * Main entry point for real-time price streaming.
 * Multiple subscribers share one engine (one timer / one socket); each tick
 * is broadcast to all of them simultaneously.
 */
export function subscribeToPrice(symbol: string, callback: PriceListener) {
  listeners.add(callback);

  if (activeSymbol !== symbol) {
    startEngine(symbol);
  } else if (currentPrice > 0) {
    // Late subscriber: sync immediately with the latest tick, no stale gap.
    callback(currentPrice);
  }

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) stopEngine();
  };
}
