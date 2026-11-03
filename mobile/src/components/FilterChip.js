import React, { useEffect, useRef } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, motion } from "../theme";
import { useReducedMotion } from "../hooks/useReducedMotion";
import Pressy from "./Pressy";
import Icon from "./Icon";

/** Chip lọc: nền chuyển mượt khi chọn, dấu chân nhỏ "nảy" lên. */
export default function FilterChip({ label, selected, onPress, icon, count, disabled, tone = "primary" }) {
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) p.setValue(selected ? 1 : 0);
    else Animated.timing(p, { toValue: selected ? 1 : 0, duration: motion.normal, useNativeDriver: false }).start();
  }, [selected, reduced, p]);
  const activeBg = tone === "accent" ? colors.accent : colors.primary;
  const activeFg = tone === "accent" ? colors.primaryDark : colors.white;
  const backgroundColor = p.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, activeBg] });
  const borderColor = p.interpolate({ inputRange: [0, 1], outputRange: [colors.border, activeBg] });
  const pawScale = p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.25, 1] });
  return (
    <Pressy
      onPress={onPress}
      disabled={disabled}
      feedback="tap"
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={count != null ? `${label}, ${count}` : label}
      accessibilityState={{ selected: !!selected }}
    >
      <Animated.View style={[styles.chip, { backgroundColor, borderColor }, disabled && { opacity: 0.5 }]}>
        {selected ? (
          <Animated.View style={{ transform: [{ scale: reduced ? 1 : pawScale }] }}>
            <Icon name={icon || "mc:paw"} size={15} color={tone === "accent" ? colors.primaryDark : colors.accent} />
          </Animated.View>
        ) : (
          icon && <Icon name={icon} size={15} color={colors.inkSoft} />
        )}
        <Text style={[styles.text, { color: selected ? activeFg : colors.ink }]}>{label}</Text>
        {count != null && (
          <View style={[styles.count, selected && { backgroundColor: "rgba(255,255,255,0.22)" }]}>
            <Text style={[styles.countText, selected && { color: activeFg }]}>{count}</Text>
          </View>
        )}
      </Animated.View>
    </Pressy>
  );
}

/** Hàng chip cuộn ngang (mặc định) hoặc xuống dòng (`wrap`). */
export function FilterChipRow({ options, value, onChange, wrap = false, style, disabled, tone }) {
  const content = options.map((o) => (
    <FilterChip
      key={String(o.id)}
      label={o.label}
      icon={o.icon}
      count={o.count}
      tone={tone}
      selected={value === o.id}
      disabled={disabled}
      onPress={() => onChange(o.id)}
    />
  ));
  if (wrap) return <View style={[styles.wrap, style]}>{content}</View>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, style]}
      style={Platform.OS === "web" ? { flexGrow: 0 } : null}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  text: { fontFamily: fonts.bold, fontSize: 14 },
  count: { minWidth: 22, paddingHorizontal: 6, height: 20, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  countText: { fontFamily: fonts.heavy, fontSize: 11, color: colors.primary },
  scroll: { gap: 8, paddingVertical: 4, paddingRight: 16 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 4 },
});

