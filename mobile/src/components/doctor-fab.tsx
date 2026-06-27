/* eslint-disable react-hooks/immutability -- Reanimated shared-value `.value`
   assignment (withTiming) is the intended API; the new react-hooks rule flags
   it as a false positive. */
import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useSegments, type Href } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { haptics } from "@/lib/haptics";
import { colors, fonts, radius, shadowGlow, shadowStrong } from "@/lib/theme";

interface Action {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  to: Href;
  primary?: boolean;
}

const ACTIONS: Action[] = [
  { key: "rx", label: "Write prescription", icon: "file-document-edit-outline", to: "/(doctor)/work-queue", primary: true },
  { key: "queue", label: "Work queue", icon: "clipboard-pulse-outline", to: "/(doctor)/work-queue" },
  { key: "refills", label: "Refill requests", icon: "pill", to: "/(doctor)/refill-requests" },
  { key: "patients", label: "Patients", icon: "account-group", to: "/(doctor)/patients" },
  { key: "messages", label: "Messages", icon: "message-text", to: "/(doctor)/messages" },
];

const TAB_SEGMENTS = new Set(["appointments", "patients", "messages", "settings"]);

export function DoctorFab() {
  const segments = useSegments() as string[];
  const [open, setOpen] = useState(false);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onTab =
    segments[0] === "(doctor)" &&
    (segments.length === 1 || (segments.length === 2 && TAB_SEGMENTS.has(segments[1])));

  const toggle = (next: boolean) => {
    setOpen(next);
    haptics.light();
    progress.value = withTiming(next ? 1 : 0, {
      duration: 200,
      easing: Easing.bezier(0.2, 0.9, 0.2, 1),
    });
  };

  const go = (to: Href) => {
    haptics.light();
    toggle(false);
    router.push(to);
  };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 12 },
      { scale: 0.92 + progress.value * 0.08 },
    ],
  }));
  const fabIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 135}deg` }],
  }));

  if (!onTab || keyboardUp) return null;

  return (
    <>
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => toggle(false)} />
      </Animated.View>

      {/* Command menu card */}
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[styles.card, cardStyle]}
      >
        {ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => go(action.to)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={[styles.rowIcon, action.primary && styles.rowIconPrimary]}>
              <MaterialCommunityIcons
                name={action.icon}
                size={20}
                color={action.primary ? "#fff" : colors.doctor}
              />
            </View>
            <Text style={[styles.rowLabel, action.primary && styles.rowLabelPrimary]}>
              {action.label}
            </Text>
            {action.primary ? (
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.doctor} />
            ) : null}
          </Pressable>
        ))}
      </Animated.View>

      {/* FAB */}
      <View pointerEvents="box-none" style={styles.fabWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? "Close quick actions" : "Quick actions"}
          onPress={() => toggle(!open)}
        >
          {({ pressed }) => (
            <LinearGradient
              colors={["#8b5cf0", "#6d3bd4", "#4a2792"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.fab, pressed && styles.fabPressed]}
            >
              <Animated.View style={fabIconStyle}>
                <MaterialCommunityIcons name="plus" size={28} color="#fff" />
              </Animated.View>
            </LinearGradient>
          )}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12, 16, 34, 0.32)",
    zIndex: 40,
  },
  card: {
    position: "absolute",
    right: 16,
    bottom: 176,
    width: 250,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 5,
    transformOrigin: "bottom right",
    zIndex: 41,
    ...shadowStrong,
    shadowOpacity: 0.18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    marginHorizontal: 4,
  },
  rowPressed: { backgroundColor: colors.doctorBg },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.doctorBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconPrimary: { backgroundColor: colors.doctor },
  rowLabel: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.text },
  rowLabelPrimary: { color: colors.doctorDark, fontFamily: fonts.heading },
  fabWrap: { position: "absolute", right: 20, bottom: 104, zIndex: 42 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    ...shadowGlow,
    shadowColor: colors.doctorDark,
  },
  fabPressed: { opacity: 0.9, transform: [{ scale: 0.94 }] },
});
