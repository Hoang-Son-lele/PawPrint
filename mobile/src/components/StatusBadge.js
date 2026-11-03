import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import Icon from "./Icon";

/** Trạng thái đơn hàng: luôn có icon + chữ, không chỉ dựa vào màu. */
export const ORDER_STATUS = {
  pending: { label: "Chờ xác nhận", icon: "time-outline", fg: colors.warning, bg: colors.warningSoft },
  confirmed: { label: "Đã xác nhận", icon: "checkmark-circle-outline", fg: colors.info, bg: colors.infoSoft },
  shipping: { label: "Đang giao", icon: "bicycle-outline", fg: colors.lilac, bg: colors.lilacSoft },
  delivered: { label: "Đã giao", icon: "gift-outline", fg: colors.success, bg: colors.successSoft },
  cancelled: { label: "Đã hủy", icon: "close-circle-outline", fg: colors.danger, bg: colors.dangerSoft },
};

export default function StatusBadge({ status, label, icon, fg, bg, size = "md" }) {
  const s = ORDER_STATUS[status] || { label: label || status, icon: icon || "ellipse-outline", fg: fg || colors.inkSoft, bg: bg || colors.surfaceMuted };
  return (
    <View style={[styles.badge, { backgroundColor: bg || s.bg }, size === "sm" && styles.sm]} accessibilityLabel={`Trạng thái: ${label || s.label}`}>
      <Icon name={icon || s.icon} size={size === "sm" ? 13 : 15} color={fg || s.fg} />
      <Text style={[styles.text, { color: fg || s.fg }, size === "sm" && { fontSize: 11.5 }]}>{label || s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  sm: { paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontFamily: fonts.heavy, fontSize: 12.5 },
});

