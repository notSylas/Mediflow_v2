import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { fonts, gradients, radius, space } from "@/lib/theme";

/**
 * Full-bleed aurora header: a diagonal gradient with soft glowing blobs.
 * Every screen uses the same header so they stay visually consistent.
 *
 * - With `children` (e.g. the home stat strip) it flows top→bottom like a hero.
 * - Without children it keeps the SAME overall height as the hero and centers
 *   the title/subtitle, so a content-light page's header still matches home.
 */
export function AuroraHeader({
  variant = "patient",
  eyebrow,
  title,
  subtitle,
  action,
  children,
}: {
  variant?: "patient" | "doctor";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const base = variant === "doctor" ? gradients.doctor : gradients.patient;
  const blobs = variant === "doctor" ? gradients.doctorBlobs : gradients.patientBlobs;
  const plain = !children;

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + 16, minHeight: insets.top + HEADER_BODY_HEIGHT },
      ]}
    >
      <LinearGradient
        colors={base}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="blobA" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={blobs[0]} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={blobs[0]} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="blobB" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={blobs[1]} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={blobs[1]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="88%" cy="6%" r={140} fill="url(#blobA)" />
        <Circle cx="6%" cy="96%" r={170} fill="url(#blobB)" />
      </Svg>

      <View style={[styles.content, plain ? styles.contentCenter : { gap: space.md }]}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
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
const HEADER_BODY_HEIGHT = 172;

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    paddingBottom: 28,
  },
  content: { flex: 1, paddingHorizontal: space.md },
  contentCenter: { justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eyebrow: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 27,
    lineHeight: 33,
    color: "#ffffff",
    letterSpacing: -0.4,
  },
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
