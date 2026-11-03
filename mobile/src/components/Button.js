import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, touch, shadow } from "../theme";
import Pressy from "./Pressy";
import Icon from "./Icon";

const VARIANTS = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  accent: { bg: colors.accent, fg: colors.primaryDark, border: colors.accent },
  secondary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
  outline: { bg: colors.surface, fg: colors.primary, border: colors.primaryTint },
  ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  dangerSolid: { bg: colors.danger, fg: colors.white, border: colors.danger },
  light: { bg: "rgba(255,255,255,0.16)", fg: colors.white, border: "rgba(255,255,255,0.28)" },
};

/**
 * Nút thống nhất. variant: primary | accent | secondary | outline | ghost | danger | dangerSolid | light
 * size: sm | md | lg. Tự chặn bấm khi `loading`.
 */
export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  disabled = false,
  full = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  feedback = "light",
  loadingText,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const inactive = disabled || loading;
  const height = size === "sm" ? 40 : size === "lg" ? 56 : 50;
  const fontSize = size === "sm" ? 14 : size === "lg" ? 17 : 15.5;
  return (
    <Pressy
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      feedback={feedback}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading }}
      style={[
        styles.base,
        {
          minHeight: Math.max(touch.min, height),
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingHorizontal: size === "sm" ? 14 : 20,
        },
        (variant === "primary" || variant === "accent") && !inactive && shadow.soft,
        full && { alignSelf: "stretch" },
        inactive && { opacity: 0.55 },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={v.fg} size="small" />
        ) : (
          icon && <Icon name={icon} size={fontSize + 4} color={v.fg} />
        )}
        {!!title && (
          <Text numberOfLines={1} style={[styles.text, { color: v.fg, fontSize }]}>
            {loading && loadingText ? loadingText : title}
          </Text>
        )}
        {!loading && iconRight && <Icon name={iconRight} size={fontSize + 3} color={v.fg} />}
      </View>
    </Pressy>
  );
}

/** Nút tròn chỉ có icon – vùng chạm tối thiểu 44×44. */
export function IconButton({ icon, onPress, label, variant = "secondary", size = 44, badge, disabled, style, color }) {
  const v = VARIANTS[variant] || VARIANTS.secondary;
  return (
    <Pressy
      onPress={onPress}
      disabled={disabled}
      feedback="tap"
      accessibilityLabel={label}
      hitSlop={6}
      scaleTo={0.9}
      style={[
        styles.iconBtn,
        { width: Math.max(44, size), height: Math.max(44, size), backgroundColor: v.bg, borderColor: v.border },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Icon name={icon} size={size * 0.48} color={color || v.fg} />
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  text: { fontFamily: fonts.heavy, textAlign: "center" },
  iconBtn: { borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { fontFamily: fonts.black, fontSize: 10.5, color: colors.primaryDark },
});

