import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow } from "../../theme";
import { CatFace, DogFace, Paw } from "../../components/Decor";
import { FilterChipRow } from "../../components/FilterChip";
import Pressy from "../../components/Pressy";
import Icon from "../../components/Icon";

export const SPECIES = [
  { id: "dog", label: "Chó", hint: "Cún con năng động", Art: DogFace, bg: "#FFF1DE" },
  { id: "cat", label: "Mèo", hint: "Hoàng thượng đáng yêu", Art: CatFace, bg: "#EEF2F8" },
  { id: "other", label: "Khác", hint: "Thỏ, chim, hamster…", Art: null, bg: "#EAF6F0" },
];

/** Card minh họa chọn Chó / Mèo / Khác. */
export function SpeciesPicker({ value, onChange, size = "lg" }) {
  const small = size === "sm";
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {SPECIES.map((s) => {
        const active = value === s.id;
        return (
          <Pressy
            key={s.id}
            onPress={() => onChange(s.id)}
            feedback="tap"
            scaleTo={0.95}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${s.label}. ${s.hint}`}
            style={[styles.card, { backgroundColor: s.bg }, small && { paddingVertical: 10 }, active && styles.active]}
          >
            {active && (
              <View style={styles.check}>
                <Icon name="checkmark" size={14} color={colors.primaryDark} />
              </View>
            )}
            <View style={{ height: small ? 52 : 78, justifyContent: "center" }}>
              {s.Art ? <s.Art size={small ? 52 : 78} /> : <Paw size={small ? 40 : 58} color={colors.mint} />}
            </View>
            <Text style={styles.label}>{s.label}</Text>
            {!small && <Text style={styles.hint}>{s.hint}</Text>}
          </Pressy>
        );
      })}
    </View>
  );
}

export function SexPicker({ value, onChange }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>Giới tính</Text>
      <FilterChipRow
        wrap
        value={value}
        onChange={(v) => onChange(v === value ? "" : v)}
        options={[
          { id: "male", label: "Đực", icon: "male" },
          { id: "female", label: "Cái", icon: "female" },
          { id: "unknown", label: "Chưa rõ", icon: "help" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  card: { flex: 1, alignItems: "center", borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: 8, borderWidth: 2.5, borderColor: "transparent" },
  active: { borderColor: colors.primary, ...shadow.soft },
  check: { position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink, marginTop: 8 },
  hint: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.inkSoft, textAlign: "center", marginTop: 2 },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginBottom: 4 },
});

