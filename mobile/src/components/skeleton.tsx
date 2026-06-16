import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
} from "react-native";
import { colors, radius, shadow } from "@/lib/theme";

/** A single pulsing placeholder block. */
export function Skeleton({
  width = "100%",
  height = 14,
  rounded = 8,
}: {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
}) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        opacity.setValue(0.85); // static placeholder, no pulse
        return;
      }
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 850, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 850, useNativeDriver: true }),
        ])
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [opacity]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius: rounded, backgroundColor: "#e3eaeb", opacity }]}
    />
  );
}

/** Card-shaped placeholder mimicking a list row. */
export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={44} height={44} rounded={22} />
        <View style={styles.lines}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <Skeleton width="90%" height={12} />
    </View>
  );
}

/** A stack of card skeletons for list-screen loading states. */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.stack}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  lines: { flex: 1, gap: 8 },
});
