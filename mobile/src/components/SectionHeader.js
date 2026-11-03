import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import Pressy from "./Pressy";
import Icon from "./Icon";

/** Tiêu đề mục: dòng phụ nhỏ (overline), tiêu đề, và hành động "Xem tất cả" tùy chọn. */
export default function SectionHeader({ overline, title, actionLabel, onAction, icon, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={{ flex: 1 }}>
        {!!overline && <Text style={styles.overline}>{overline}</Text>}
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {icon && <Icon name={icon} size={18} color={colors.accent} />}
        </View>
      </View>
      {!!actionLabel && (
        <Pressy onPress={onAction} accessibilityLabel={actionLabel} style={styles.action} hitSlop={8}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Icon name="chevron-forward" size={16} color={colors.primary} />
        </Pressy>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", marginTop: 26, marginBottom: 12, gap: 12 },
  overline: {
    fontFamily: fonts.heavy,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.accentDark,
    marginBottom: 3,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontFamily: fonts.heavy, fontSize: 20, lineHeight: 27, color: colors.ink },
  action: { flexDirection: "row", alignItems: "center", minHeight: 44, paddingLeft: 8 },
  actionText: { fontFamily: fonts.heavy, fontSize: 14, color: colors.primary },
});

