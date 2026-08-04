import { useState } from "react";
import { motion } from "framer-motion";
import { XAUUSD_BASE_PRICE } from "@/services/priceService";

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  spread: number;
}

const markets: MarketItem[] = [
  { symbol: "OANDA:XAUUSD", name: "Gold", price: XAUUSD_BASE_PRICE, change: 1.42, spread: 0.3 },
  { symbol: "OANDA:EURUSD", name: "Euro/Dollar", price: 1.0872, change: -0.15, spread: 0.1 },
  { symbol: "BITSTAMP:BTCUSD", name: "Bitcoin", price: 67520.00, change: 2.95, spread: 15.0 },
  { symbol: "NASDAQ:NDX", name: "NASDAQ 100", price: 18245.30, change: 0.65, spread: 1.2 },
  { symbol: "OANDA:GBPUSD", name: "Pound/Dollar", price: 1.2715, change: 0.32, spread: 0.2 },
  { symbol: "OANDA:USDJPY", name: "Dollar/Yen", price: 154.85, change: -0.08, spread: 0.2 },
];

interface Props {
  selected: string;
  onSelect: (symbol: string) => void;
}

export function MarketWatch({ selected, onSelect }: Props) {
  return (
    <div className="glass-panel rounded-xl p-4 h-full flex flex-col glow-border-gold">
      <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
        Market Watch
      </h3>
      <div className="flex flex-col gap-1 flex-1 overflow-auto scrollbar-thin">
        {markets.map((m) => (
          <motion.button
            key={m.symbol}
            onClick={() => onSelect(m.symbol)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
              selected === m.symbol
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-accent/50 border border-transparent"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-sm font-semibold ${selected === m.symbol ? "text-primary" : "text-foreground"}`}>
                  {m.symbol}
                </p>
                <p className="text-xs text-muted-foreground">{m.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-medium text-foreground">
                  {m.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <p className={`text-xs font-medium ${m.change >= 0 ? "text-profit" : "text-loss"}`}>
                  {m.change >= 0 ? "+" : ""}{m.change}%
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
