import React, { useMemo } from "react";
import { Signal, SignalType } from "@/lib/indicators/scalperLite";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  signals: Signal[];
  minPrice: number;
  maxPrice: number;
}

/**
 * TradingOverlay renders non-repainting buy/sell arrows.
 * It sits above the TradingView chart.
 * Note: Precise alignment with an external iframe is tricky. 
 * This implementation uses a simplified relative positioning for demonstration.
 */
export function TradingOverlay({ signals, minPrice, maxPrice }: Props) {
  // Use a fixed price range if min/max are too close or default
  const effectiveMin = minPrice === maxPrice ? minPrice - 10 : minPrice;
  const effectiveMax = minPrice === maxPrice ? maxPrice + 10 : maxPrice;
  const priceRange = effectiveMax - effectiveMin;

  const renderArrow = (signal: Signal) => {
    // Calculate Y percentage based on price
    // Ensure yPos is within 0-100%
    const rawYPos = ((effectiveMax - signal.price) / priceRange) * 100;
    const yPos = Math.max(5, Math.min(95, rawYPos));
    
    // Spread signals across the full width of the overlay
    // Use the signal's index in the array to determine X position for now
    const signalIndex = signals.indexOf(signal);
    const xPos = (signalIndex / Math.max(1, signals.length - 1)) * 90 + 5;

    const isBuy = signal.type.startsWith("BUY");
    const isStrong = !signal.type.endsWith("_CONFIRM");

    const color = isBuy ? "#22c55e" : "#ef4444"; // emerald-500 : red-500
    const size = isStrong ? 24 : 16;
    const label = isStrong ? (isBuy ? "Strong Buy" : "Strong Sell") : (isBuy ? "Buy Confirm" : "Sell Confirm");

    return (
      <motion.div
        key={`${signal.time}-${signal.type}`}
        initial={{ opacity: 0, scale: 0.5, y: isBuy ? 20 : -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="absolute flex flex-col items-center pointer-events-none"
        style={{
          left: `${xPos}%`,
          top: `${yPos}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {!isBuy && (
          <div className="flex flex-col items-center">
             <span className="text-[8px] font-bold uppercase mb-1" style={{ color }}>{label}</span>
             <ArrowDown size={size} color={color} />
          </div>
        )}
        {isBuy && (
          <div className="flex flex-col items-center">
             <ArrowUp size={size} color={color} />
             <span className="text-[8px] font-bold uppercase mt-1" style={{ color }}>{label}</span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
      <AnimatePresence>
        {signals.map(renderArrow)}
      </AnimatePresence>
    </div>
  );
}

function ArrowUp({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4L4 12H9V20H15V12H20L12 4Z" fill={color} stroke="white" strokeWidth="0.5" />
    </svg>
  );
}

function ArrowDown({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20L20 12H15V4H9V12H4L12 20Z" fill={color} stroke="white" strokeWidth="0.5" />
    </svg>
  );
}
