"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// Parametric heart curve (see AGENTS reference: Heart Wave loader) — traced
// once per app-boot suspense, not per route. Deliberately kept off the
// "no spinners" pattern in docs/Design.md: this is the one narrow exception,
// approved for the shell/session boot moment only, not per-fetch loading.
const ROOT = 3.3;
const B = 3.2;
const AMP = 0.9;
const SCALE_X = 23.2;
const SCALE_Y = 24.5;
const PARTICLE_COUNT = 64;
const TRAIL_SPAN = 0.18;
const DURATION_MS = 2400;
const PULSE_DURATION_MS = 1600;

function point(progress: number, detailScale: number) {
  const xLimit = Math.sqrt(ROOT);
  const x = -xLimit + progress * xLimit * 2;
  const safeRoot = Math.max(0, ROOT - x * x);
  const wave = AMP * Math.sqrt(safeRoot) * Math.sin(B * Math.PI * x);
  const curve = Math.pow(Math.abs(x), 2 / 3);
  const y = curve + wave;
  const scaleY = SCALE_Y + detailScale * 1.5;
  return { x: 50 + x * SCALE_X, y: 18 + (1.75 - y) * scaleY };
}

function normalize(progress: number) {
  return ((progress % 1) + 1) % 1;
}

function buildPath(detailScale: number, steps = 220) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const p = point(i / steps, detailScale);
    return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }).join(" ");
}

function subscribeToReducedMotion(onStoreChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BootLoader() {
  const pathRef = useRef<SVGPathElement>(null);
  const particleRefs = useRef<(SVGCircleElement | null)[]>([]);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  useEffect(() => {
    if (reducedMotion) return;
    const startedAt = performance.now();
    let frame: number;

    function render(now: number) {
      const time = now - startedAt;
      const progress = (time % DURATION_MS) / DURATION_MS;
      const pulseAngle =
        ((time % PULSE_DURATION_MS) / PULSE_DURATION_MS) * Math.PI * 2;
      const detailScale = 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48;

      pathRef.current?.setAttribute("d", buildPath(detailScale));

      particleRefs.current.forEach((node, index) => {
        if (!node) return;
        const tailOffset = index / (PARTICLE_COUNT - 1);
        const p = point(
          normalize(progress - tailOffset * TRAIL_SPAN),
          detailScale
        );
        const fade = Math.pow(1 - tailOffset, 0.56);
        node.setAttribute("cx", p.x.toFixed(2));
        node.setAttribute("cy", p.y.toFixed(2));
        node.setAttribute("r", (0.7 + fade * 2.1).toFixed(2));
        node.setAttribute("opacity", (0.04 + fade * 0.8).toFixed(3));
      });

      frame = requestAnimationFrame(render);
    }

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-primary">
      <svg viewBox="0 0 100 100" className="h-20 w-20" fill="none" aria-hidden="true">
        <path
          ref={pathRef}
          stroke="currentColor"
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={reducedMotion ? 0.55 : 0.12}
          d={buildPath(0.75)}
        />
        {!reducedMotion &&
          Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <circle
              key={i}
              ref={(node) => {
                particleRefs.current[i] = node;
              }}
              fill="currentColor"
            />
          ))}
      </svg>
      <p className="text-sm text-muted-foreground">Loading MediFlow…</p>
    </div>
  );
}
