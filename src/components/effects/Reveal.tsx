"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/core/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger offset in ms, applied when the element enters the viewport. */
  delay?: number;
}

/**
 * Fades + slides its children up the first time they scroll into view.
 * Uses transform/opacity only (no layout thrash) and shows content
 * immediately when the user prefers reduced motion.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Show immediately, no scroll animation; can't be done in render (needs
      // window.matchMedia, which is unavailable during SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}
