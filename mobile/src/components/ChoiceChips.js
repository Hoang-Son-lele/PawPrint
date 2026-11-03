import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { palette } from "../theme";
export default function ChoiceChips({ options, value, onChange, disabled }) {
  return (
    <View style={s.row}>
      {options.map((option) => (
        <Pressable
          key={option.id}
          disabled={disabled}
          onPress={() => onChange(option.id)}
          style={[s.chip, value === option.id && s.active]}
        >
          <Text style={[s.text, value === option.id && s.selected]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  active: { backgroundColor: palette.primary, borderColor: palette.primary },
  text: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: palette.ink },
  selected: { color: "#fff" },
});
