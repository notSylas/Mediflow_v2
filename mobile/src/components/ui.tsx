import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  colors,
  fonts,
  gradients,
  radius,
  shadow,
  shadowGlow,
  shadowSoft,
  space,
} from "@/lib/theme";
import { PressableScale } from "@/components/motion";

export function Screen({
  children,
  refreshing,
  onRefresh,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function BackHeader({
  title,
  onBack,
  subtitle,
}: {
  title: string;
  onBack: () => void;
  subtitle?: string;
}) {
  return (
    <View style={styles.backHeader}>
      <IconButton icon="chevron-left" label="Go back" onPress={onBack} />
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.caption}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function Card({
  children,
  tone = "default",
  elevated,
  style,
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "warning" | "danger" | "doctor";
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const toneStyle = {
    default: null,
    accent: { backgroundColor: colors.accent, borderColor: "#d4def8" },
    warning: { backgroundColor: colors.warningBg, borderColor: "#f0dcb0" },
    danger: { backgroundColor: colors.dangerBg, borderColor: "#f3cfcf" },
    doctor: { backgroundColor: colors.doctorBg, borderColor: "#ddd2f6" },
  }[tone];

  return (
    <View style={[styles.card, toneStyle, elevated && styles.cardElevated, style]}>
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({
  children,
  strong,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <Text style={[styles.body, strong && { fontFamily: fonts.bodySemibold }]}>
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Caption({ children }: { children: React.ReactNode }) {
  return <Text style={styles.caption}>{children}</Text>;
}

/** Tabular numerals (Geist Mono) for money, times, doses. */
export function Mono({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.mono, style]}>{children}</Text>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Field({
  label,
  multiline,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        {...props}
        style={[styles.input, multiline && styles.textarea, props.style]}
      />
    </View>
  );
}

export function CompactField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType={keyboardType}
      style={styles.compactInput}
    />
  );
}

type ButtonTone = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  label,
  onPress,
  icon,
  loading,
  disabled,
  tone = "primary",
  compact,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  tone?: ButtonTone;
  compact?: boolean;
}) {
  const solid = tone === "primary" || tone === "danger";
  const foreground = solid ? colors.primaryFg : colors.text;
  const trailingIcon = Boolean(icon && !compact);

  const body = loading ? (
    <ActivityIndicator color={foreground} />
  ) : trailingIcon ? (
    <>
      <Text numberOfLines={1} style={[styles.buttonText, { color: foreground }]}>
        {label}
      </Text>
      <View
        style={[
          styles.buttonIconBubble,
          solid ? styles.buttonIconBubbleSolid : styles.buttonIconBubbleSubtle,
        ]}
      >
        <MaterialCommunityIcons
          name={icon!}
          size={17}
          color={solid ? colors.text : foreground}
        />
      </View>
    </>
  ) : (
    <>
      {icon ? (
        <MaterialCommunityIcons name={icon} size={18} color={foreground} />
      ) : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </>
  );

  // Primary gets a real cobalt gradient + colored elevation (the premium CTA).
  if (tone === "primary") {
    return (
      <PressableScale
        accessibilityRole="button"
        onPress={onPress}
        disabled={disabled || loading}
        haptic="light"
        style={[
          styles.buttonShadow,
          compact && styles.buttonCompactWrap,
          (disabled || loading) && { opacity: 0.55 },
        ]}
      >
        <LinearGradient
          colors={gradients.patient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            trailingIcon && styles.buttonWithTrailingIcon,
            compact && styles.buttonCompact,
          ]}
        >
          {body}
        </LinearGradient>
      </PressableScale>
    );
  }

  const toneStyle = {
    secondary: { backgroundColor: colors.card, borderColor: colors.borderStrong },
    danger: { backgroundColor: colors.danger, borderColor: colors.danger },
    ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  }[tone];

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      haptic={tone === "ghost" ? false : "light"}
      style={[
        styles.button,
        styles.buttonBordered,
        toneStyle,
        tone === "danger" && shadowSoft,
        trailingIcon && styles.buttonWithTrailingIcon,
        compact && styles.buttonCompact,
        (disabled || loading) && { opacity: 0.55 },
      ]}
    >
      {body}
    </PressableScale>
  );
}

export function PrimaryButton(props: Omit<React.ComponentProps<typeof Button>, "tone">) {
  return <Button {...props} tone="primary" />;
}

export function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return <Button label={label} onPress={onPress} tone="ghost" />;
}

export function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.iconButton}
    >
      <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
    </PressableScale>
  );
}

export function ChoiceChips({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: string }>;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            scaleTo={0.96}
            haptic="light"
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: string; count?: number }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            scaleTo={0.98}
            haptic="light"
            style={[styles.segment, selected && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
              {option.label}
              {option.count == null ? "" : `  ${option.count}`}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function StatusBadge({
  status,
  audience = "doctor",
}: {
  status: string;
  audience?: "patient" | "doctor";
}) {
  const config: Record<string, { label: string; bg: string; fg: string }> = {
    pending_payment: {
      label: "Awaiting payment",
      bg: colors.warningBg,
      fg: colors.warning,
    },
    confirmed: { label: "Confirmed", bg: colors.successBg, fg: colors.success },
    completed: { label: "Completed", bg: colors.infoBg, fg: colors.info },
    cancelled: { label: "Cancelled", bg: colors.surfaceStrong, fg: colors.textMuted },
    no_show: {
      label: audience === "patient" ? "Missed" : "No-show",
      bg: colors.dangerBg,
      fg: colors.danger,
    },
    draft: { label: "Draft", bg: colors.warningBg, fg: colors.warning },
    issued: { label: "Issued", bg: colors.successBg, fg: colors.success },
  };
  const item = config[status] ?? {
    label: status,
    bg: colors.surfaceStrong,
    fg: colors.textMuted,
  };
  return (
    <View style={[styles.badge, { backgroundColor: item.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: item.fg }]} />
      <Text style={[styles.badgeText, { color: item.fg }]}>{item.label}</Text>
    </View>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: "primary" | "doctor" | "warning" | "info";
}) {
  const palette = {
    primary: { bg: colors.accent, fg: colors.primary },
    doctor: { bg: colors.doctorBg, fg: colors.doctor },
    warning: { bg: colors.warningBg, fg: colors.warning },
    info: { bg: colors.infoBg, fg: colors.info },
  }[tone];
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: palette.bg }]}>
        <MaterialCommunityIcons name={icon} size={19} color={palette.fg} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, doctor }: { name: string; doctor?: boolean }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <LinearGradient
      colors={doctor ? gradients.doctor : gradients.patient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.avatar}
    >
      <Text style={styles.avatarText}>{initials || "MF"}</Text>
    </LinearGradient>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  compact,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Card>
      <View style={[styles.empty, compact && styles.emptyCompact]}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={[styles.muted, { textAlign: "center" }]}>{message}</Text>
        {action}
      </View>
    </Card>
  );
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card tone="danger">
      <View style={styles.errorRow}>
        <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={[styles.body, { color: colors.danger }]}>{message}</Text>
          {onRetry ? (
            <Button label="Try again" onPress={onRetry} tone="secondary" compact />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export function Loading({ label = "Loading your clinic…" }: { label?: string }) {
  return (
    <SafeAreaView style={styles.loading}>
      <LinearGradient
        colors={gradients.patient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.brandMark}
      >
        <MaterialCommunityIcons name="heart-pulse" size={28} color={colors.primaryFg} />
      </LinearGradient>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </SafeAreaView>
  );
}

export function ScreenGlow({ variant = "patient" }: { variant?: "patient" | "doctor" }) {
  const tint = variant === "doctor" ? colors.doctorLight : colors.primaryLight;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.screenGlowPrimary, { backgroundColor: tint }]} />
      <View style={[styles.screenGlowSecondary, { backgroundColor: tint }]} />
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <LinearGradient
        colors={gradients.patient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.progressValue,
          { width: `${Math.max(0, Math.min(100, value))}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: space.md + 2, paddingBottom: 120, gap: 14 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  backHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: {
    fontSize: 27,
    lineHeight: 32,
    fontFamily: fonts.display,
    letterSpacing: -0.7,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontFamily: fonts.heading,
    letterSpacing: -0.4,
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.heading,
    letterSpacing: -0.3,
    color: colors.text,
  },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.body, color: colors.text },
  muted: { fontSize: 14, fontFamily: fonts.body, color: colors.textMuted, lineHeight: 20 },
  caption: { fontSize: 12, fontFamily: fonts.body, color: colors.textFaint, lineHeight: 17 },
  mono: { fontFamily: fonts.monoSemibold, color: colors.text, letterSpacing: -0.3 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    gap: space.sm,
    ...shadowSoft,
  },
  cardElevated: { ...shadow },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 3 },
  fieldWrap: { gap: 7 },
  label: { fontSize: 13, fontFamily: fonts.bodySemibold, color: colors.text },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  textarea: { minHeight: 110, paddingTop: 14, paddingBottom: 14 },
  compactInput: {
    minHeight: 44,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  buttonShadow: { borderRadius: radius.pill, ...shadowGlow },
  buttonCompactWrap: { alignSelf: "flex-start" },
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonBordered: { borderWidth: 1 },
  buttonWithTrailingIcon: {
    justifyContent: "space-between",
    paddingRight: 8,
    paddingLeft: 20,
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: 16 },
  buttonText: { fontSize: 15, fontFamily: fonts.semibold, letterSpacing: -0.1 },
  buttonIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIconBubbleSolid: { backgroundColor: "#ffffff" },
  buttonIconBubbleSubtle: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowSoft,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.bodySemibold },
  chipTextActive: { color: colors.primaryDark },
  segmented: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceStrong,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  segmentActive: { backgroundColor: colors.card, ...shadowSoft },
  segmentText: {
    fontSize: 13,
    fontFamily: fonts.bodySemibold,
    color: colors.textMuted,
  },
  segmentTextActive: { color: colors.text },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11.5, fontFamily: fonts.bodySemibold, letterSpacing: -0.1 },
  statCard: {
    width: "48%",
    minHeight: 112,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 15,
    ...shadowSoft,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    marginTop: 10,
    fontSize: 24,
    fontFamily: fonts.monoSemibold,
    letterSpacing: -0.6,
    color: colors.text,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primaryFg, fontSize: 16, fontFamily: fonts.heading },
  empty: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyCompact: { paddingVertical: 6 },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  emptyTitle: { fontSize: 16, fontFamily: fonts.heading, color: colors.text },
  errorRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    backgroundColor: colors.bg,
  },
  brandMark: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    ...shadowGlow,
  },
  progressTrack: {
    height: 9,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: colors.surfaceStrong,
  },
  progressValue: { height: "100%", borderRadius: radius.pill },
  screenGlowPrimary: {
    position: "absolute",
    right: -110,
    top: 140,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.05,
  },
  screenGlowSecondary: {
    position: "absolute",
    left: -130,
    bottom: 120,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.04,
  },
});
