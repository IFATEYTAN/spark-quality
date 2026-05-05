// ספירה מונפשת
import { useEffect, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}

export function AnimatedNumber({ value, duration = 1500, format }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [value, duration]);

  return <>{format ? format(display) : display.toLocaleString("he-IL")}</>;
}
