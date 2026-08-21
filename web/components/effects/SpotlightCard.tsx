"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A surface that lights up with a soft glow following the cursor. Pass the
 * card's own classes (bg, padding, radius) via className — the glow is an
 * overlay clipped to the rounded shape.
 */
export function SpotlightCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={cn("group/spot relative overflow-hidden", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100 motion-reduce:hidden"
        style={{
          background:
            "radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in oklch, var(--primary) 22%, transparent), transparent 65%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
