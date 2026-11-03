import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme";
import Button from "./Button";
import Icon from "./Icon";
import FadeIn from "./FadeIn";
import { PawTrail } from "./Decor";

/**
 * Trạng thái trống / lỗi thân thiện: minh họa, lời gợi ý và hành động tiếp theo.
 * tone: "empty" | "error" | "success"
 */
export default function EmptyState({
  icon = "mc:paw",
  emoji,
  title,
  message,
  actionLabel,
  onAction,
  actionIcon,
  secondaryLabel,
  onSecondary,
  tone = "empty",
  compact = false,
  style,
}) {
  const palette =
    tone === "error"
      ? { bg: colors.dangerSoft, fg: colors.danger }
      : tone === "success"
        ? { bg: colors.successSoft, fg: colors.success }
        : { bg: colors.accentSoft, fg: colors.accentDark };
  return (
    <FadeIn from="scale" style={[styles.card, compact && styles.compact, style]}>
      {!compact && <PawTrail style={styles.trail} />}
      <View
        style={[styles.bubble, { backgroundColor: palette.bg }, compact && { width: 64, height: 64 }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {emoji ? (
          <Text style={{ fontSize: compact ? 30 : 40 }}>{emoji}</Text>
        ) : (
          <Icon name={icon} size={compact ? 30 : 40} color={palette.fg} />
        )}
      </View>
      <Text style={styles.title} accessibilityRole={tone === "error" ? "alert" : "text"}>
        {title}
      </Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
      {(actionLabel || secondaryLabel) && (
        <View style={styles.actions}>
          {!!actionLabel && (
            <Button
              title={actionLabel}
              icon={actionIcon || (tone === "error" ? "refresh" : undefined)}
              variant={tone === "error" ? "primary" : "accent"}
              onPress={onAction}
            />
          )}
          {!!secondaryLabel && <Button title={secondaryLabel} variant="ghost" onPress={onSecondary} />}
        </View>
      )}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  compact: { paddingVertical: 20 },
  trail: { position: "absolute", top: 10, right: 14, opacity: 0.5 },
  bubble: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontFamily: fonts.heavy, fontSize: 18, lineHeight: 25, color: colors.ink, textAlign: "center" },
  message: {
    fontFamily: fonts.medium,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.inkSoft,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 420,
  },
  actions: { marginTop: 18, gap: 6, alignItems: "center", alignSelf: "stretch", maxWidth: 360, width: "100%" },
});

