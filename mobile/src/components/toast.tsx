import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow } from "@/lib/theme";

type ToastType = "success" | "error" | "info";
interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VARIANT: Record<
  ToastType,
  { icon: keyof typeof MaterialCommunityIcons.glyphMap; fg: string; bg: string }
> = {
  success: { icon: "check-circle", fg: colors.success, bg: colors.successBg },
  error: { icon: "alert-circle", fg: colors.danger, bg: colors.dangerBg },
  info: { icon: "information", fg: colors.info, bg: colors.infoBg },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = "info") => {
    if (timer.current) clearTimeout(timer.current);
    Haptics.notificationAsync(
      type === "error"
        ? Haptics.NotificationFeedbackType.Error
        : type === "success"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
    ).catch(() => undefined);
    setToast({ id: Date.now(), type, message });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // `show` is a stable useCallback, so this api object stays stable too.
  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      info: (m) => show(m, "info"),
    }),
    [show]
  );

  const variant = toast ? VARIANT[toast.type] : null;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && variant ? (
        <Animated.View
          key={toast.id}
          entering={FadeInUp.springify().damping(18)}
          exiting={FadeOutUp.duration(180)}
          pointerEvents="box-none"
          style={[styles.wrap, { top: insets.top + 8 }]}
        >
          <Pressable
            onPress={() => setToast(null)}
            style={[styles.toast, { backgroundColor: variant.bg }]}
          >
            <MaterialCommunityIcons name={variant.icon} size={20} color={variant.fg} />
            <Text style={[styles.text, { color: variant.fg }]} numberOfLines={2}>
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, alignItems: "center", zIndex: 1000 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 520,
    width: "100%",
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...shadow,
  },
  text: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 14 },
});
