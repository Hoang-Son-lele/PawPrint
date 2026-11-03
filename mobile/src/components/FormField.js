import React, { forwardRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, radius } from "../theme";
import Icon from "./Icon";

/**
 * Trường nhập có nhãn rõ, đánh dấu bắt buộc, lỗi hiển thị ngay dưới trường,
 * gợi ý phụ, icon trái và nút hiện/ẩn mật khẩu.
 */
const FormField = forwardRef(function FormField(
  {
    label,
    required,
    error,
    hint,
    icon,
    password,
    suffix,
    changed,
    multiline,
    style,
    inputStyle,
    editable = true,
    maxLength,
    value,
    onFocus,
    onBlur,
    accessibilityLabel,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  return (
    <View style={[styles.wrap, style]}>
      {!!label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
          {changed && (
            <View style={styles.changed} accessibilityLabel="Đã thay đổi">
              <Text style={styles.changedText}>Đã sửa</Text>
            </View>
          )}
        </View>
      )}
      <View
        style={[
          styles.box,
          { borderColor },
          focused && styles.focused,
          multiline && { alignItems: "flex-start", minHeight: 104 },
          !editable && { backgroundColor: colors.surfaceMuted },
        ]}
      >
        {icon && (
          <Icon
            name={icon}
            size={20}
            color={focused ? colors.primary : colors.muted}
            style={multiline ? { marginTop: 14 } : null}
          />
        )}
        <TextInput
          ref={ref}
          style={[styles.input, multiline && styles.multiline, inputStyle]}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          secureTextEntry={password && hidden}
          multiline={multiline}
          editable={editable}
          value={value}
          maxLength={maxLength}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={error || hint}
        />
        {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
        {password && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Hiện mật khẩu" : "Ẩn mật khẩu"}
            hitSlop={8}
            style={styles.eye}
          >
            <Icon name={hidden ? "eye-outline" : "eye-off-outline"} size={21} color={colors.inkSoft} />
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Icon name="alert-circle" size={15} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint || maxLength ? (
        <View style={styles.hintRow}>
          <Text style={styles.hint}>{hint}</Text>
          {!!maxLength && multiline && (
            <Text style={styles.hint}>
              {String(value || "").length}/{maxLength}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
});
export default FormField;

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  required: { color: colors.danger },
  changed: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  changedText: { fontFamily: fonts.heavy, fontSize: 10.5, color: colors.warning },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  focused: { backgroundColor: "#FDFEFF" },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 12,
    outlineStyle: "none",
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  suffix: { fontFamily: fonts.bold, fontSize: 15, color: colors.inkSoft },
  eye: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 6 },
  error: { flex: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.danger },
  hintRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, gap: 8 },
  hint: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.muted, flexShrink: 1 },
});
