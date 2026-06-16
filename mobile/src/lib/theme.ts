export const colors = {
  primary: "#07877d",
  primaryDark: "#056b64",
  primaryFg: "#ffffff",
  bg: "#f3f6f6",
  card: "#ffffff",
  text: "#172126",
  textMuted: "#66747b",
  border: "#dce4e6",
  accent: "#ddf5f1",
  accentFg: "#096b62",
  info: "#2563eb",
  infoBg: "#eaf1ff",
  success: "#0b8f61",
  successBg: "#e1f7ed",
  warning: "#b75d00",
  warningBg: "#fff2d5",
  danger: "#c93333",
  dangerBg: "#fde9e9",
  doctor: "#5b55d6",
  doctorBg: "#eeecff",
  overlay: "rgba(23, 33, 38, 0.45)",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
/** Consistent spacing scale: 4 / 8 / 12 / 16 / 24 / 32. */
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32 };

/** Figtree for display/headings (warm, confident); Noto Sans for body. Loaded
 *  in the root layout; falls back to system if not yet ready. */
export const fonts = {
  display: "Figtree_800ExtraBold",
  heading: "Figtree_700Bold",
  semibold: "Figtree_600SemiBold",
  body: "NotoSans_400Regular",
  bodyMedium: "NotoSans_500Medium",
  bodySemibold: "NotoSans_600SemiBold",
};

/** Aurora gradient palettes for hero headers + accents. */
export const gradients = {
  patient: ["#0bb1a3", "#07877d", "#045d56"] as const,
  doctor: ["#7a73f5", "#5b55d6", "#403a9c"] as const,
  // Soft blob accents painted over the hero for the aurora glow.
  patientBlobs: ["#5ff0dd", "#0bb1a3"] as const,
  doctorBlobs: ["#a9a4ff", "#6f68f0"] as const,
};
export const shadow = {
  shadowColor: "#172126",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
};
