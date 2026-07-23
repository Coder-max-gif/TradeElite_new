import { useEffect, useState } from "react";

export function useAnimatedValue(baseValue: number, range = 4, interval = 1800) {
  const [displayValue, setDisplayValue] = useState(baseValue);

  useEffect(() => {
    setDisplayValue(baseValue);
    const timer = setInterval(() => {
      const offset = Math.random() * range * 2 - range;
      setDisplayValue(Number((baseValue + offset).toFixed(2)));
    }, interval);

    return () => clearInterval(timer);
  }, [baseValue, range, interval]);

  return displayValue;
}
