/* eslint-disable react-hooks/immutability -- Reanimated shared-value `.value`
   assignment (withSpring) is the intended API; the new react-hooks rule flags
   it as a false positive. */
import { useEffect, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, fonts, radius } from "@/lib/theme";

export type GlassTabBarVariant = "patient" | "doctor";

const variantStyles = {
  patient: { accent: colors.primary, highlight: colors.accent },
  doctor: { accent: colors.doctor, highlight: colors.doctorBg },
} satisfies Record<GlassTabBarVariant, { accent: string; highlight: string }>;

/** Crisp dark-slate inactive tint (matches the Apple Files look). */
export const tabInactiveTint = "#565b68";

export type TabIconMap = Record<string, keyof typeof MaterialCommunityIcons.glyphMap>;

const HIGHLIGHT_W = 50;
const HIGHLIGHT_H = 34;

/**
 * Custom floating tab bar with a single "glass slab" that springs between tabs.
 * Solid white, crisp hairline edge — no blur (so the outline stays sharp).
 *
 * `icons` maps a route name to its filled icon. Only routes present in the map
 * are shown (this is how we drop the hidden `href: null` routes).
 */
export function GlassTabBar({
  state,
  descriptors,
  navigation,
  variant,
  icons,
}: BottomTabBarProps & {
  variant: GlassTabBarVariant;
  icons: TabIconMap;
}) {
  const palette = variantStyles[variant];
  const [rowWidth, setRowWidth] = useState(0);
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const visible = state.routes.filter((r) => icons[r.name]);
  const activeKey = state.routes[state.index]?.key;
  const rawActiveIndex = visible.findIndex((r) => r.key === activeKey);
  const activeIndex = Math.max(0, rawActiveIndex);
  const itemWidth = visible.length > 0 ? rowWidth / visible.length : 0;

  const tx = useSharedValue(0);
  useEffect(() => {
    tx.value = withSpring(activeIndex * itemWidth, {
      damping: 18,
      stiffness: 190,
      mass: 0.6,
    });
  }, [activeIndex, itemWidth, tx]);

  const slabStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  // Hide on focused sub-screens (booking, settings, details) and when typing.
  if (rawActiveIndex < 0 || keyboardUp) return null;

  return (
    <View style={styles.bar}>
      <View style={styles.topHighlight} />
      <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
        {itemWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slab,
              slabStyle,
              {
                left: (itemWidth - HIGHLIGHT_W) / 2,
                width: HIGHLIGHT_W,
                backgroundColor: palette.highlight,
              },
            ]}
          />
        ) : null}

        {visible.map((route) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const focused = route.key === activeKey;
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={styles.item}
            >
              <View style={styles.iconSlot}>
                <MaterialCommunityIcons
                  name={icons[route.name]}
                  size={25}
                  color={focused ? palette.accent : tabInactiveTint}
                />
                {badge != null ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.label, { color: focused ? palette.accent : tabInactiveTint }]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    height: 74,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "rgba(17, 20, 42, 0.10)",
    borderRadius: radius.xxl,
    backgroundColor: "#ffffff",
    shadowColor: "#0a0f1f",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 14,
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 26,
    right: 26,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  row: { flex: 1, flexDirection: "row", alignItems: "center", position: "relative" },
  slab: {
    position: "absolute",
    top: (56 - HIGHLIGHT_H) / 2,
    height: HIGHLIGHT_H,
    borderRadius: 12,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, height: 56 },
  iconSlot: { width: 46, height: 34, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: fonts.bodySemibold, fontSize: 9.5, letterSpacing: -0.1 },
  badge: {
    position: "absolute",
    top: 0,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontFamily: fonts.bodySemibold, fontSize: 9 },
});
