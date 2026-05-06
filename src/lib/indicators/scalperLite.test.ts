import { ScalperLiteCalculator, Candle, Signal } from "./scalperLite";

/**
 * Basic verification test for ScalperLite logic
 */
export function verifyIndicator() {
  const calculator = new ScalperLiteCalculator({
    halfLength: 5, // Small length for testing
    appliedPrice: "CLOSE",
    bandsDeviations: 1.0,
    arrowOffset: 0.1
  });

  // Generate 100 candles for better TMA warm-up
  const candles: Candle[] = [];
  const baseTime = Date.now();
  let price = 100;
  
  for (let i = 0; i < 150; i++) {
    const prevPrice = price;
    // Normal trend
    price += (Math.random() - 0.5) * 0.5;
    
    // Create a "Lower Band Pierce" at index 120
    if (i === 120) price = 90; 
    // Bullish reversal at index 121
    if (i === 121) price = 95;

    candles.push({
      time: baseTime + i * 60000,
      open: prevPrice,
      high: Math.max(prevPrice, price) + 0.2,
      low: Math.min(prevPrice, price) - 0.2,
      close: price,
    });
  }

  console.log("Starting calculation with", candles.length, "candles...");
  const signals = calculator.calculate(candles);
  
  console.log("Generated signals:", signals.length);
  signals.forEach(s => {
    console.log(`- ${s.type} at ${new Date(s.time).toLocaleTimeString()} @ ${s.price}`);
  });

  if (signals.length > 0) {
    console.log("✅ Verification successful: Signals generated.");
  } else {
    console.log("⚠️ No signals generated. This might be expected depending on parameters.");
  }

  return signals;
}

// If running in node/bun directly
if (import.meta.main) {
  verifyIndicator();
}
