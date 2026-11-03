/**
 * Lớp tương thích cho các màn hình quản trị cũ: giữ nguyên API (Page, Title, Caption,
 * TextField, PrimaryButton, ErrorText, Card) nhưng dùng hệ thống thiết kế mới.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow } from "../theme";
import FormField from "./FormField";
import Button from "./Button";
import Icon from "./Icon";

export function Page({ children, style }) {
  return (
    <SafeAreaView style={[styles.page, style]} edges={["bottom", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}
export function Title({ children, style }) {
  return (
    <Text accessibilityRole="header" style={[styles.title, style]}>
      {children}
    </Text>
  );
}
export function Caption({ children, style }) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}
export function TextField(props) {
  return <FormField {...props} />;
}
export function PrimaryButton({ title, onPress, loading = false, disabled = false, variant = "primary", icon, style }) {
  return (
    <Button
      title={title}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      icon={icon}
      variant={variant === "secondary" ? "secondary" : variant}
      style={[{ marginTop: 10 }, style]}
      full
    />
  );
}
export function ErrorText({ error }) {
  if (!error) return null;
  return (
    <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="alert-circle" size={18} color={colors.danger} />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
}
export function SuccessText({ message }) {
  if (!message) return null;
  return (
    <View style={[styles.error, { backgroundColor: colors.successSoft }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="checkmark-circle" size={18} color={colors.success} />
      <Text style={[styles.errorText, { color: colors.success }]}>{message}</Text>
    </View>
  );
}
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 18 },
  title: { fontFamily: fonts.heavy, fontSize: 22, lineHeight: 30, color: colors.ink, marginBottom: 6 },
  caption: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  error: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: 12,
    marginVertical: 8,
  },
  errorText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.danger },
  card: {
    padding: 18,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginVertical: 8,
    ...shadow.soft,
  },
});
