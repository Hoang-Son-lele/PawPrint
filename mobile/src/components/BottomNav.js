import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, motion, shadow } from "../theme";
import { useReducedMotion } from "../hooks/useReducedMotion";
import Pressy from "./Pressy";
import Icon from "./Icon";

export const TABS = [
  { path: "/", icon: "home", label: "Trang chủ" },
  { path: "/moments", icon: "images", label: "Khoảnh khắc" },
  { path: "/care", icon: "heart", label: "Chăm sóc" },
  { path: "/shop", icon: "storefront", label: "Pet Shop" },
  { path: "/profile", icon: "person", label: "Cá nhân" },
];
export const TAB_PATHS = TABS.map((t) => t.path);

function Tab({ tab, active }) {
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) p.setValue(active ? 1 : 0);
    else Animated.spring(p, { toValue: active ? 1 : 0, speed: 18, bounciness: 9, useNativeDriver: Platform.OS !== "web" }).start();
  }, [active, reduced, p]);
  return (
    <Pressy
      onPress={() => !active && router.replace(tab.path)}
      feedback="tap"
      scaleTo={0.92}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      style={styles.tab}
    >
      <Animated.View style={{ transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>
        <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
          <Icon name={active ? tab.icon : `${tab.icon}-outline`} size={22} color={active ? colors.primary : colors.muted} />
        </View>
      </Animated.View>
      <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>
        {tab.label}
      </Text>
      <Animated.View style={[styles.dot, { opacity: p, transform: [{ scale: p }] }]} />
    </Pressy>
  );
}

/** Thanh điều hướng dưới: icon rõ nghĩa có nhãn, tab chọn màu xanh + điểm nhấn vàng. */
export default function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (!TAB_PATHS.includes(pathname)) return null;
  return (
    <View style={[styles.outer, { paddingBottom: Math.max(10, insets.bottom) }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityRole="tablist">
        {TABS.map((tab) => (
          <Tab key={tab.path} tab={tab} active={pathname === tab.path} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, alignItems: "center" },
  bar: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 560,
    backgroundColor: colors.surface,
    borderRadius: 26,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.lifted,
  },
  tab: { flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", paddingTop: 2 },
  iconWrap: { width: 46, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  iconWrapActive: { backgroundColor: colors.primarySoft },
  label: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.muted, marginTop: 2 },
  labelActive: { fontFamily: fonts.heavy, color: colors.primary },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent, marginTop: 2 },
});

export const transitionMs = motion.normal;
