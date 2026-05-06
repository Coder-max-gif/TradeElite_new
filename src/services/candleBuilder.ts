import { type Candle } from "../lib/indicators/scalperLite";

export interface OHLCVStore {
  candles: Candle[];
  currentCandle: Candle | null;
}

/**
 * CandleBuilder transforms a stream of price ticks into OHLCV candles.
 * For simplicity in this dashboard, we'll use a fixed time interval (e.g., 1 minute).
 */
export class CandleBuilder {
  private candles: Candle[] = [];
  private currentCandle: Candle | null = null;
  private intervalMs: number;

  constructor(intervalMinutes: number = 1) {
    this.intervalMs = intervalMinutes * 60 * 1000;
  }

  /**
   * Processes a new price tick.
   * Returns true if a new candle was completed.
   */
  addTick(price: number, timestamp: number = Date.now()): boolean {
    // For testing: use a shorter interval (10 seconds) so candles close faster
    const testIntervalMs = 10 * 1000; 
    const candleStartTime = Math.floor(timestamp / testIntervalMs) * testIntervalMs;

    if (!this.currentCandle || this.currentCandle.time !== candleStartTime) {
      // Start a new candle
      if (this.currentCandle) {
        this.candles.push({ ...this.currentCandle });
      }

      this.currentCandle = {
        time: candleStartTime,
        open: price,
        high: price,
        low: price,
        close: price,
      };

      // Keep only last 200 candles for performance
      if (this.candles.length > 200) {
        this.candles.shift();
      }

      return true;
    }

    // Update current candle
    this.currentCandle.high = Math.max(this.currentCandle.high, price);
    this.currentCandle.low = Math.min(this.currentCandle.low, price);
    this.currentCandle.close = price;

    return false;
  }

  getCandles(): Candle[] {
    return [...this.candles];
  }

  getCurrentCandle(): Candle | null {
    return this.currentCandle ? { ...this.currentCandle } : null;
  }

  /**
   * For non-repainting indicators, we only care about fully closed candles.
   */
  getClosedCandles(): Candle[] {
    return [...this.candles];
  }
}
