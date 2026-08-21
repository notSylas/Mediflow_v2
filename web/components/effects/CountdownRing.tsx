"use client";

import { useEffect, useState } from "react";

function parts(msLeft: number) {
  const totalMin = Math.max(0, Math.floor(msLeft / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return { big: String(days), unit: days === 1 ? "day" : "days" };
  if (hours > 0) return { big: String(hours), unit: hours === 1 ? "hour" : "hours" };
  return { big: String(mins), unit: "min" };
}

/**
 * Live countdown to an appointment, drawn as an animated SVG ring. The ring
 * fills as the slot approaches (over the last `windowHours`).
 */
export function CountdownRing({
  startsAt,
  windowHours = 24,
  size = 92,
}: {
  startsAt: string;
  windowHours?: number;
  size?: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(startsAt).getTime();
  const msLeft = target - now;
  const windowMs = windowHours * 3600_000;
  const progress = Math.min(1, Math.max(0, 1 - msLeft / windowMs));

  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const { big, unit } = parts(msLeft);

  return (
    <div className="relative" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums leading-none">{big}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
