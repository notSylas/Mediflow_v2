// Categorical accent tones. Teal stays the brand colour; these give each data
// category its own identity so dashboards read as colour-coded, not monochrome.
// Muted (100/700) on purpose — professional, not neon (the design guide warns
// against neon/AI gradients for healthcare). Full class strings are written
// out so Tailwind's scanner generates them.

export type ToneName = "teal" | "blue" | "violet" | "amber" | "emerald" | "rose";

export interface Tone {
  /** Coloured icon chip. */
  chip: string;
  /** Subtle tinted card surface (gradient fading into the card colour). */
  tile: string;
}

export const TONES: Record<ToneName, Tone> = {
  teal: {
    chip: "bg-teal-100 text-teal-700",
    tile: "border bg-gradient-to-br from-teal-50/70 to-card",
  },
  blue: {
    chip: "bg-blue-100 text-blue-700",
    tile: "border bg-gradient-to-br from-blue-50/70 to-card",
  },
  violet: {
    chip: "bg-violet-100 text-violet-700",
    tile: "border bg-gradient-to-br from-violet-50/70 to-card",
  },
  amber: {
    chip: "bg-amber-100 text-amber-700",
    tile: "border bg-gradient-to-br from-amber-50/70 to-card",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-700",
    tile: "border bg-gradient-to-br from-emerald-50/70 to-card",
  },
  rose: {
    chip: "bg-rose-100 text-rose-700",
    tile: "border bg-gradient-to-br from-rose-50/70 to-card",
  },
};
