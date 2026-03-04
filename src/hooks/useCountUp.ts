"use client";

import { useState, useEffect, useRef } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(
  target: number,
  duration = 800,
  formatter: (n: number) => string = (n) => String(n)
): string {
  const [display, setDisplay] = useState(formatter(0));
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === 0) {
      setDisplay(formatter(0));
      return;
    }

    const start = prevTarget.current;
    const diff = target - start;
    let raf: number;
    const t0 = performance.now();

    function tick(now: number) {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      const value = start + diff * easeOutCubic(progress);
      setDisplay(formatter(Math.round(value)));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevTarget.current = target;
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, formatter]);

  return display;
}
