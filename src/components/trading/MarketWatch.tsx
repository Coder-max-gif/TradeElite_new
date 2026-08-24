import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/state/store";
import { SYMBOLS, askPrice, bidPrice, symbolStatus } from "@/lib/symbols";

interface Props {
  selected: string;
  onSelect: (symbol: string) => void;
}

type Direction = "up" | "down" | "flat";

export function MarketWatch({ selected, onSelect }: Props) {
  const { prices, priceOf, now } = useStore();

  // Colour each quote by the direction of its last change, the way a real
  // market-watch window blinks on every tick.
  const previousRef = useRef<Record<string, number>>({});
  const [directions, setDirections] = useState<Record<string, Direction>>({});

  useEffect(() => {
    const next: Record<string, Direction> = {};
    for (const spec of SYMBOLS) {
      const price = prices[spec.id];
      if (!price) continue;
      const previous = previousRef.current[spec.id];
      next[spec.id] = !previous || price === previous ? "flat" : price > previous ? "up" : "down";
      previousRef.current[spec.id] = price;
    }
    setDirections((current) => ({ ...current, ...next }));
  }, [prices]);

  return (
    <div className="glass-panel rounded-xl p-4 h-full flex flex-col glow-border-gold">
      <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
        Market Watch
      </h3>
      <div className="flex flex-col gap-1 flex-1 overflow-auto scrollbar-thin">
        {SYMBOLS.map((spec) => {
          const mid = priceOf(spec.id);
          const direction = directions[spec.id] ?? "flat";
          const isSelected = selected === spec.id;
          const open = symbolStatus(spec.id, new Date(now)).open;

          return (
            <motion.button
              key={spec.id}
              onClick={() => onSelect(spec.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                isSelected
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-accent/50 border border-transparent"
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      isSelected ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {spec.display}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{spec.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-mono font-bold ${
                      !open
                        ? "text-muted-foreground"
                        : direction === "up"
                          ? "text-profit"
                          : direction === "down"
                            ? "text-loss"
                            : "text-foreground"
                    }`}
                  >
                    {mid > 0 ? mid.toFixed(spec.digits) : "—"}
                  </p>
                  {open ? (
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {mid > 0
                        ? `${bidPrice(spec.id, mid).toFixed(spec.digits)} / ${askPrice(spec.id, mid).toFixed(spec.digits)}`
                        : "connecting…"}
                    </p>
                  ) : (
                    <span className="text-[9px] font-bold text-loss border border-loss/30 rounded px-1">
                      CLOSED
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
