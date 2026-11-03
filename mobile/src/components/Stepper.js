import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { IconButton } from "./Button";

/** Chọn số lượng với nút +/- đủ lớn (44×44). */
export default function Stepper({ value, onChange, min = 1, max = 99, disabled, syncing, size = 44, label = "Số lượng" }) {
  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${value}`}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment" && value < max) onChange(value + 1);
        if (e.nativeEvent.actionName === "decrement" && value > min) onChange(value - 1);
      }}
    >
      <IconButton icon="remove" label={`Giảm ${label.toLowerCase()}`} onPress={() => onChange(value - 1)} disabled={disabled || value <= min} variant="outline" size={size} />
      <View style={[styles.value, { minWidth: size }]}>
        {syncing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.text}>{value}</Text>}
      </View>
      <IconButton icon="add" label={`Tăng ${label.toLowerCase()}`} onPress={() => onChange(value + 1)} disabled={disabled || value >= max} variant="primary" size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  value: { alignItems: "center", justifyContent: "center", height: 44 },
  text: { fontFamily: fonts.black, fontSize: 18, color: colors.ink },
});

