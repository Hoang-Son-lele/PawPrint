import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const enabled = Platform.OS === "ios" || Platform.OS === "android";
const safe = (fn) => {
  if (!enabled) return;
  try {
    fn()?.catch?.(() => {});
  } catch {
    /* Haptics không bắt buộc. */
  }
};

/** Phản hồi rung nhẹ cho các hành động quan trọng (bỏ qua trên web). */
export const haptic = {
  tap: () => safe(() => Haptics.selectionAsync()),
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

