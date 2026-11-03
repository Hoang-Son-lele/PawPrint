import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, motion } from "../theme";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { IconButton } from "./Button";
import Button from "./Button";
import Icon from "./Icon";

/** Bottom sheet trượt lên từ đáy; đóng bằng nút, chạm nền hoặc nút Back. */
export default function BottomSheet({ visible, onClose, title, subtitle, children, footer, dismissible = true, scroll = true }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(p, {
      toValue: visible ? 1 : 0,
      duration: reduced ? 0 : visible ? motion.slow : motion.normal,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, reduced, p]);
  if (!mounted) return null;
  const close = () => dismissible && onClose?.();
  const Body = scroll ? ScrollView : View;
  return (
    <Modal transparent visible animationType="none" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: p }]}>
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Đóng" accessibilityRole="button" />
        </Animated.View>
        <View style={styles.anchor} pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
              { transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }] },
            ]}
          >
            <View style={styles.grabber} />
            {(title || dismissible) && (
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  {!!title && (
                    <Text accessibilityRole="header" style={styles.title}>
                      {title}
                    </Text>
                  )}
                  {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                {dismissible && <IconButton icon="close" label="Đóng" onPress={close} variant="secondary" size={40} />}
              </View>
            )}
            <Body
              style={scroll ? { flexGrow: 0 } : null}
              contentContainerStyle={scroll ? styles.body : undefined}
              keyboardShouldPersistTaps="handled"
            >
              {scroll ? children : <View style={styles.body}>{children}</View>}
            </Body>
            {footer && <View style={styles.footer}>{footer}</View>}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Hộp xác nhận cho hành động ảnh hưởng lớn – giải thích hậu quả rõ ràng.
 */
export function ConfirmSheet({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Để sau",
  destructive = false,
  loading = false,
  icon,
}) {
  return (
    <BottomSheet visible={visible} onClose={loading ? undefined : onClose} dismissible={!loading} scroll={false}>
      <View style={{ alignItems: "center", paddingTop: 4 }}>
        <View style={[styles.confirmIcon, { backgroundColor: destructive ? colors.dangerSoft : colors.accentSoft }]}>
          <Icon
            name={icon || (destructive ? "trash-outline" : "help-circle-outline")}
            size={30}
            color={destructive ? colors.danger : colors.accentDark}
          />
        </View>
        <Text style={[styles.title, { textAlign: "center" }]}>{title}</Text>
        {!!message && <Text style={styles.confirmMessage}>{message}</Text>}
      </View>
      <View style={{ gap: 8, marginTop: 20 }}>
        <Button
          title={confirmLabel}
          variant={destructive ? "dangerSolid" : "primary"}
          onPress={onConfirm}
          loading={loading}
          feedback="medium"
          full
        />
        <Button title={cancelLabel} variant="ghost" onPress={onClose} disabled={loading} full />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  anchor: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: {
    width: "100%",
    maxWidth: 640,
    maxHeight: "92%",
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 8,
  },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "#DCD3C3", marginBottom: 6 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 8 },
  title: { fontFamily: fonts.heavy, fontSize: 20, lineHeight: 27, color: colors.ink },
  subtitle: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.inkSoft, marginTop: 2 },
  body: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  confirmIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  confirmMessage: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 23,
    color: colors.inkSoft,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 440,
  },
});

