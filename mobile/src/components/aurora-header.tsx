import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, gradients, radius, space } from "@/lib/theme";

/**
 * Full-bleed aurora header using one native gradient surface.
 * Every screen uses the same header so they stay visually consistent.
 *
 * - With `children` (e.g. the home stat strip) it flows top→bottom like a hero.
 * - Compact headers size to their title row instead of reserving hero space.
 * - Full headers retain a consistent minimum height for dashboard content.
 */
export function AuroraHeader({
  variant = "patient",
  eyebrow,
  title,
  subtitle,
  compact = false,
  leading,
  action,
  children,
}: {
  variant?: "patient" | "doctor";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  compact?: boolean;
  leading?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const base = variant === "doctor" ? gradients.doctor : gradients.patient;
  const plain = !children;

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        {
          paddingTop: compact ? insets.top : insets.top + 16,
          minHeight: compact ? undefined : insets.top + HEADER_BODY_HEIGHT,
        },
      ]}
    >
      <LinearGradient
        colors={base}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.content,
          compact && styles.contentCompact,
          plain && !compact ? styles.contentCenter : { gap: space.md },
        ]}
      >
        <View style={[styles.topRow, compact && styles.topRowCompact]}>
          {leading}
          <View style={{ flex: 1 }}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
        {children}
      </View>
    </View>
  );
}

// Height of the header below the status bar inset — keeps every header the same size.
const HEADER_BODY_HEIGHT = 146;
const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    paddingBottom: 28,
  },
  wrapCompact: { paddingBottom: 14 },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: space.md,
  },
  contentCompact: { flex: 0 },
  contentCenter: { justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  topRowCompact: { alignItems: "center" },
  eyebrow: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 30,
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  titleCompact: { fontSize: 22, lineHeight: 28 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.9)",
    marginTop: 5,
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
});

export const auroraHeaderStyles = styles;
