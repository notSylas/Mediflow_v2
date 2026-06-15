"use client";

import { useEffect, useState } from "react";

/** Thin progress bar that fills from 0 to `value`% on mount. */
export function ProgressBar({ value }: { value: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // One-time jump to the final width; can't be done in render (needs
      // window.matchMedia, which is unavailable during SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWidth(value);
      return;
    }
    const id = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
