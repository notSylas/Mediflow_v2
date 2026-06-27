/**
 * MediFlow design tokens — "Premium Clinical Glass", mobile.
 *
 * Aligned to the web design system (docs/Design.md): cobalt-blue patient
 * identity, violet doctor identity, Geist / Geist Mono type, cool-neutral
 * canvas. Depth (bold gradient + glass) is spent only on hero/status surfaces;
 * dense data lists stay flat and scannable.
 */
export const colors = {
  // Patient identity — deep cobalt (web: oklch(0.46 0.19 258)).
  primary: "#2a4cc7",
  primaryLight: "#4b6ee8",
  primaryDark: "#1b2f86",
  primaryFg: "#ffffff",

  // Canvas — cool neutral, reads clinical/iOS rather than warm paper.
  bg: "#f5f6fb",
  card: "#ffffff",
  surface: "#fbfbfe",
  surfaceStrong: "#eef0f8",
  surfaceMuted: "#f3f4fa",
  surfaceSunken: "#f6f7fc",

  // Ink.
  text: "#10142a",
  textMuted: "#6b7180",
  textFaint: "#9499ab",

  // Lines.
  border: "#eceef5",
  borderStrong: "#dde0ec",
  cardBorder: "#eaecf3",
  hairline: "#f0f2f8",
  pressed: "rgba(16, 20, 42, 0.05)",

  // Accent fills (cobalt-tinted, replacing the old teal accents).
  accent: "#eaf0ff",
  accentFg: "#2541a8",

  info: "#2a4cc7",
  infoBg: "#eaf0ff",
  success: "#0c7d56",
  successBg: "#e4f6ec",
  warning: "#b9760f",
  warningBg: "#fff1dd",
  danger: "#dc4a4a",
  dangerBg: "#fdecec",

  // Doctor identity — deep violet (web: oklch(0.42 0.2 303)).
  doctor: "#6d3bd4",
  doctorLight: "#8b5cf0",
  doctorDark: "#4a2792",
  doctorBg: "#efe9fc",

  overlay: "rgba(16, 20, 42, 0.5)",

  // Glass — translucent surfaces that sit on the gradient heros.
  glass: "rgba(255, 255, 255, 0.16)",
  glassBorder: "rgba(255, 255, 255, 0.28)",
  glassStrong: "rgba(255, 255, 255, 0.82)",
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, xxl: 30, pill: 999 };
/** Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. */
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32 };

/**
 * Geist for everything (UI/headings/body) — the screen-native, SF-adjacent
 * geometric family the web app uses. Geist Mono for money, times, and doses
 * (tabular). Loaded in the root layout; falls back to system until ready.
 */
export const fonts = {
  display: "Geist_800ExtraBold",
  heading: "Geist_700Bold",
  semibold: "Geist_600SemiBold",
  body: "Geist_400Regular",
  bodyMedium: "Geist_500Medium",
  bodySemibold: "Geist_600SemiBold",
  mono: "GeistMono_500Medium",
  monoSemibold: "GeistMono_600SemiBold",
};

/**
 * Gradient palettes. The bold `patient`/`doctor` ramps power the home hero
 * surfaces (white text on top). The `soft` ramps are for restrained washes.
 */
export const gradients = {
  // Bold identity gradients — hero surfaces, white foreground.
  patient: ["#4b6ee8", "#2a4cc7", "#1b2f86"] as const,
  doctor: ["#8b5cf0", "#6d3bd4", "#4a2792"] as const,
  // Subtle near-white washes for flat secondary headers.
  patientSoft: ["#fbfcff", "#f5f6fb", "#eef2ff"] as const,
  doctorSoft: ["#fdfcff", "#f6f5fb", "#f1ecfc"] as const,
  // Glow blobs painted over a hero for aurora depth.
  patientBlobs: ["rgba(75,110,232,0.55)", "rgba(27,47,134,0.0)"] as const,
  doctorBlobs: ["rgba(139,92,240,0.55)", "rgba(74,39,146,0.0)"] as const,
};

/** Tints for the gradient sheen/highlight inside hero cards. */
export const heroTint = {
  patient: {
    kicker: "#c9d6ff",
    meta: "#d5deff",
    glow: "rgba(75,110,232,0.6)",
  },
  doctor: {
    kicker: "#e2d4ff",
    meta: "#ecdfff",
    glow: "rgba(139,92,240,0.6)",
  },
};

export const shadow = {
  shadowColor: "#0f1733",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 14,
  elevation: 2,
};
export const shadowSoft = {
  shadowColor: "#0f1733",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 10,
  elevation: 1,
};
export const shadowStrong = {
  shadowColor: "#0c1430",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.12,
  shadowRadius: 30,
  elevation: 7,
};
/** Colored elevation under hero CTAs / floating accents. */
export const shadowGlow = {
  shadowColor: "#1b2f86",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.28,
  shadowRadius: 20,
  elevation: 6,
};
