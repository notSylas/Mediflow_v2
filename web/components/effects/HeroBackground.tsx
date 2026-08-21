"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's living backdrop: a deep multi-stop gradient base, three drifting
 * aurora orbs, and a soft spotlight that follows the cursor. Decorative only
 * (aria-hidden); the cursor glow is skipped under reduced-motion.
 */
export function HeroBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = ref.current;
    const section = wrapper?.parentElement;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        section.style.setProperty("--mx", `${x}%`);
        section.style.setProperty("--my", `${y}%`);
      });
    };

    section.addEventListener("mousemove", onMove);
    return () => {
      section.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#052b2a_0%,#0a3d39_45%,#063134_100%)]" />
      <div className="animate-aurora-1 absolute -top-24 left-[12%] h-80 w-80 rounded-full bg-emerald-400/30 blur-3xl" />
      <div className="animate-aurora-2 absolute -top-10 right-[8%] h-[26rem] w-[26rem] rounded-full bg-teal-300/25 blur-3xl" />
      <div className="animate-aurora-3 absolute bottom-[-4rem] left-[38%] h-80 w-80 rounded-full bg-cyan-400/25 blur-3xl" />
      {/* cursor spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(420px_circle_at_var(--mx,70%)_var(--my,25%),rgba(255,255,255,0.10),transparent_65%)] transition-[background] duration-200" />
    </div>
  );
}
