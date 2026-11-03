import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow } from "../theme";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { haptic } from "../utils/haptics";
import Icon from "./Icon";
import Pressy from "./Pressy";

const ToastContext = createContext({ show: () => {} });
const TONES = {
  success: { icon: "mc:paw", bg: colors.primary, fg: colors.white, accent: colors.accent },
  error: { icon: "alert-circle", bg: colors.danger, fg: colors.white, accent: colors.white },
  info: { icon: "information-circle", bg: colors.ink, fg: colors.white, accent: colors.accent },
};

/** Thông báo ngắn ở đáy màn hình, kèm dấu chân "bật" nhẹ khi thành công. */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, { tone = "success", action, onAction, duration = 2600 } = {}) => {
    clearTimeout(timer.current);
    if (tone === "success") haptic.success();
    if (tone === "error") haptic.error();
    setToast({ id: Date.now(), message, tone, action, onAction });
    timer.current = setTimeout(() => setToast(null), duration);
  }, []);
  const api = useMemo(
    () => ({
      show,
      success: (m, o) => show(m, { ...o, tone: "success" }),
      error: (m, o) => show(m, { ...o, tone: "error", duration: 4200 }),
      info: (m, o) => show(m, { ...o, tone: "info" }),
      hide: () => setToast(null),
    }),
    [show],
  );
  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && <ToastView key={toast.id} toast={toast} onClose={() => setToast(null)} />}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onClose }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const pop = useRef(new Animated.Value(reduced ? 1 : 0.3)).current;
  useEffect(() => {
    if (reduced) return;
    Animated.parallel([
      Animated.timing(p, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }),
      Animated.spring(pop, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  }, [reduced, p, pop]);
  const t = TONES[toast.tone] || TONES.info;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + 92, opacity: p, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: t.bg }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <Icon name={t.icon} size={22} color={t.accent} />
        </Animated.View>
        <Text style={[styles.text, { color: t.fg }]}>{toast.message}</Text>
        {!!toast.action && (
          <Pressy
            onPress={() => {
              toast.onAction?.();
              onClose();
            }}
            style={styles.action}
            accessibilityLabel={toast.action}
          >
            <Text style={styles.actionText}>{toast.action}</Text>
          </Pressy>
        )}
      </View>
    </Animated.View>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 1000 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    maxWidth: 520,
    width: "100%",
    ...shadow.lifted,
  },
  text: { flex: 1, fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 20 },
  action: { minHeight: 36, justifyContent: "center", paddingHorizontal: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.16)" },
  actionText: { fontFamily: fonts.heavy, color: colors.accent, fontSize: 13.5 },
});

