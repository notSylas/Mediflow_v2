"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Leans its children in 3D toward the cursor on hover, then settles back.
 * Pure transform, settles via transition; disabled under reduced-motion.
 */
export function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1000px) rotateY(${px * max}deg) rotateX(${-py * max}deg)`;
  };

  const handleLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        "transition-transform duration-300 ease-out [transform-style:preserve-3d] motion-reduce:!transform-none",
        className
      )}
    >
      {children}
    </div>
  );
}
