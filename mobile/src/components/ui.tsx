import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow, space } from "@/lib/theme";
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
      <View style={{ flex: 1, gap: 3 }}>
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
      <IconButton icon="arrow-left" label="Go back" onPress={onBack} />
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
  style,
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "warning" | "danger" | "doctor";
  style?: StyleProp<ViewStyle>;
}) {
  const toneStyle = {
    default: null,
    accent: { backgroundColor: colors.accent, borderColor: "#c8e9e4" },
    warning: { backgroundColor: colors.warningBg, borderColor: "#f4d89d" },
    danger: { backgroundColor: colors.dangerBg, borderColor: "#f2caca" },
    doctor: { backgroundColor: colors.doctorBg, borderColor: "#d9d5ff" },
  }[tone];

  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
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
        placeholderTextColor={colors.textMuted}
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
      placeholderTextColor={colors.textMuted}
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
  const toneStyle = {
    primary: { backgroundColor: colors.primary, borderColor: colors.primary },
    secondary: { backgroundColor: colors.card, borderColor: colors.border },
    danger: { backgroundColor: colors.danger, borderColor: colors.danger },
    ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  }[tone];
  const foreground =
    tone === "primary" || tone === "danger" ? colors.primaryFg : colors.text;

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      haptic={tone === "ghost" ? false : "light"}
      style={[
        styles.button,
        toneStyle,
        compact && styles.buttonCompact,
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={18} color={foreground} /> : null}
          <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
        </>
      )}
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
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.65 }]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={colors.text} />
    </Pressable>
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
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
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
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentActive,
              pressed && { opacity: 0.72 },
            ]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
              {option.label}
              {option.count == null ? "" : `  ${option.count}`}
            </Text>
          </Pressable>
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
    cancelled: { label: "Cancelled", bg: "#edf0f1", fg: colors.textMuted },
    no_show: {
      label: audience === "patient" ? "Missed" : "No-show",
      bg: colors.dangerBg,
      fg: colors.danger,
    },
    draft: { label: "Draft", bg: colors.warningBg, fg: colors.warning },
    issued: { label: "Issued", bg: colors.successBg, fg: colors.success },
  };
  const item = config[status] ?? { label: status, bg: "#edf0f1", fg: colors.textMuted };
  return (
    <View style={[styles.badge, { backgroundColor: item.bg }]}>
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
    <View style={[styles.avatar, doctor && { backgroundColor: colors.doctor }]}>
      <Text style={styles.avatarText}>{initials || "MF"}</Text>
    </View>
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
          <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
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
          {onRetry ? <Button label="Try again" onPress={onRetry} tone="secondary" compact /> : null}
        </View>
      </View>
    </Card>
  );
}

export function Loading({ label = "Loading your clinic…" }: { label?: string }) {
  return (
    <SafeAreaView style={styles.loading}>
      <View style={styles.brandMark}>
        <MaterialCommunityIcons name="heart-pulse" size={27} color={colors.primaryFg} />
      </View>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.muted}>{label}</Text>
    </SafeAreaView>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressValue, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  screen: { padding: space.md, paddingBottom: 110, gap: space.md },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  backHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: fonts.display,
    letterSpacing: -0.3,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fonts.heading,
    letterSpacing: -0.2,
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.heading,
    letterSpacing: -0.2,
    color: colors.text,
  },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.body, color: colors.text },
  muted: { fontSize: 14, fontFamily: fonts.body, color: colors.textMuted, lineHeight: 20 },
  caption: { fontSize: 12, fontFamily: fonts.body, color: colors.textMuted, lineHeight: 17 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
    ...shadow,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 3 },
  fieldWrap: { gap: 7 },
  label: { fontSize: 13, fontFamily: fonts.bodySemibold, color: colors.text },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  textarea: { minHeight: 106, paddingTop: 13, paddingBottom: 13 },
  compactInput: {
    minHeight: 42,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.card,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCompact: { minHeight: 38, alignSelf: "flex-start", paddingHorizontal: 12 },
  buttonText: { fontSize: 15, fontFamily: fonts.semibold, letterSpacing: 0.1 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.bodySemibold },
  chipTextActive: { color: colors.primaryDark },
  segmented: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: "#e8eeee",
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  segmentActive: { backgroundColor: colors.card, ...shadow },
  segmentText: {
    fontSize: 13,
    fontFamily: fonts.bodySemibold,
    color: colors.textMuted,
  },
  segmentTextActive: { color: colors.text },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontFamily: fonts.bodySemibold },
  statCard: {
    width: "48%",
    minHeight: 108,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadow,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    marginTop: 8,
    fontSize: 22,
    fontFamily: fonts.display,
    letterSpacing: -0.4,
    color: colors.text,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  avatarText: { color: colors.primaryFg, fontSize: 15, fontFamily: fonts.heading },
  empty: { alignItems: "center", gap: 8, paddingVertical: 14 },
  emptyCompact: { paddingVertical: 6 },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontFamily: fonts.heading, color: colors.text },
  errorRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: colors.bg,
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: "#e8eeee",
  },
  progressValue: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primary },
});
