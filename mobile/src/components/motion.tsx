import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { haptics } from "@/lib/haptics";

/**
 * Fades + lifts its children in on mount. Uses the core Animated API with the
 * native driver (no reanimated babel setup required). `index` staggers a list;
 * `delay` offsets the whole thing.
 */
export function FadeInView({
  children,
  index = 0,
  delay = 0,
  distance = 14,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 460,
      delay: delay + index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay, index]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Pressable that springs down on touch and fires a haptic tap. Drop-in for
 * tactile cards and buttons.
 */
export function PressableScale({
  children,
  onPress,
  style,
  scaleTo = 0.97,
  haptic = "light",
  disabled,
  ...rest
}: PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: "light" | "medium" | false;
}) {
  const scale = useMemo(() => new Animated.Value(1), []);

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/**
 * Counts a number up from 0 to `value` on mount (eased). For the hero stat
 * tiles. Pass `format` to render currency/percent etc.
 */
export function CountUp({
  value,
  duration = 900,
  format = (n) => String(n),
  style,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <Text style={style}>{format(display)}</Text>;
}
