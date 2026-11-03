import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, typography } from "../theme";

export function Page({ children, style }) {
  return (
    <SafeAreaView
      style={[styles.page, style]}
      edges={["bottom", "left", "right"]}
    >
      {children}
    </SafeAreaView>
  );
}
export function Title({ children }) {
  return <Text style={styles.title}>{children}</Text>;
}
export function Caption({ children }) {
  return <Text style={styles.caption}>{children}</Text>;
}
export function TextField({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={palette.muted}
        autoCapitalize="none"
        {...props}
      />
    </View>
  );
}
export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}) {
  const isSecondary = variant === "secondary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.buttonSecondary,
        (pressed || disabled || loading) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? palette.primary : "#FFF"} />
      ) : (
        <Text
          style={[styles.buttonText, isSecondary && styles.buttonTextSecondary]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function ErrorText({ error }) {
  return error ? <Text style={styles.error}>{error}</Text> : null;
}
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background, paddingHorizontal: 20 },
  title: {
    ...typography.heading,
    color: palette.ink,
    fontSize: 27,
    lineHeight: 36,
    marginBottom: 10,
  },
  caption: {
    ...typography.regular,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 23,
  },
  field: { marginVertical: 7 },
  label: {
    ...typography.heading,
    color: palette.ink,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 22,
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    ...typography.regular,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 24,
    color: palette.ink,
  },
  button: {
    backgroundColor: palette.primary,
    minHeight: 49,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 12,
  },
  buttonSecondary: { backgroundColor: palette.subtle },
  buttonText: {
    ...typography.heading,
    color: "#FFF",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    paddingVertical: 10,
  },
  buttonTextSecondary: { color: palette.primaryDark },
  error: { color: palette.error, marginVertical: 8, fontSize: 14 },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    marginVertical: 8,
  },
});
