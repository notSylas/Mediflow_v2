import * as Haptics from "expo-haptics";

/** Thin wrappers so screens can add tactile feedback without importing the
 *  enum everywhere. All are fire-and-forget and safe to ignore failures. */
export const haptics = {
  light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  selection: () => void Haptics.selectionAsync().catch(() => {}),
};
