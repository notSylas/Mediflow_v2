import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  fonts,
  gradients,
  heroTint,
  radius,
  shadowSoft,
  space,
} from "@/lib/theme";

/**
 * Flat large-title header for list/detail screens. Cool-neutral surface, big
 * Geist title, hairline base. No gradient — depth is reserved for the home
 * hero (see HeroHeader) per the "gradient only where it earns trust" rule.
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
  const accent = variant === "doctor" ? colors.doctor : colors.primary;

  return (
    <View style={[styles.flatWrap, { paddingTop: insets.top + (compact ? 10 : 16) }]}>
      <View style={styles.flatContent}>
        <View style={[styles.topRow, leading ? styles.topRowLeading : null]}>
          {leading}
          <View style={{ flex: 1 }}>
            {eyebrow ? (
              <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
            ) : null}
            <Text style={[styles.flatTitle, compact && styles.flatTitleCompact]}>
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
        {children}
      </View>
    </View>
  );
}

/**
 * Bold gradient hero for the home screens. White foreground on the identity
 * gradient, soft aurora glow, and a children slot for the "next visit" pass.
 */
export function HeroHeader({
  variant = "patient",
  eyebrow,
  title,
  leading,
  action,
  children,
}: {
  variant?: "patient" | "doctor";
  eyebrow?: string;
  title: string;
  leading?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const ramp = variant === "doctor" ? gradients.doctor : gradients.patient;
  const tint = variant === "doctor" ? heroTint.doctor : heroTint.patient;

  return (
    <View style={styles.heroWrap}>
      <LinearGradient
        colors={ramp}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Aurora glow + top sheen for depth. */}
      <View style={[styles.heroGlow, { backgroundColor: tint.glow }]} />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.heroSheen}
      />
      <View style={[styles.heroContent, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroTopRow}>
          {leading}
          <View style={{ flex: 1 }}>
            {eyebrow ? (
              <Text style={[styles.heroEyebrow, { color: tint.kicker }]}>{eyebrow}</Text>
            ) : null}
            <Text style={styles.heroTitle}>{title}</Text>
          </View>
          {action}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Flat header.
  flatWrap: {
    backgroundColor: colors.bg,
    paddingBottom: 8,
  },
  flatContent: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: space.md + 2,
    gap: space.md,
  },
  topRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  topRowLeading: { alignItems: "center" },
  eyebrow: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  flatTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 35,
    color: colors.text,
    letterSpacing: -0.8,
  },
  flatTitleCompact: { fontSize: 26, lineHeight: 31, letterSpacing: -0.6 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 5,
  },

  // Hero header.
  heroWrap: {
    overflow: "hidden",
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  heroGlow: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.5,
  },
  heroSheen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 120,
  },
  heroContent: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: space.md + 4,
    paddingBottom: 22,
    gap: 18,
  },
  heroTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroEyebrow: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12.5,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 33,
    color: "#ffffff",
    letterSpacing: -0.8,
    marginTop: 3,
  },
});

/** Round glass action button for hero headers (settings, etc.). */
export const auroraHeaderStyles = StyleSheet.create({
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadowSoft,
  },
  glassAction: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
