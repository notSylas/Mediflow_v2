"use client";

import { useEffect, useRef, useState } from "react";

/** Animates a number from 0 to `value` on mount (eased). Respects reduced motion. */
export function CountUp({
  value,
  suffix = "",
  duration = 900,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // One-time jump to the final value; can't be done in render (needs
      // window.matchMedia, which is unavailable during SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setN(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  );
}
