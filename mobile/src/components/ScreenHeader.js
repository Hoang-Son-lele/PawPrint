import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, layout } from "../theme";
import { IconButton } from "./Button";

/**
 * Header thống nhất: nút quay lại đủ lớn, tiêu đề dễ nhận biết, hành động phụ bên phải.
 * `tone` = "light" (nền kem) | "primary" (nền xanh).
 */
export default function ScreenHeader({ title, subtitle, back = true, onBack, right, tone = "light", transparent }) {
  const insets = useSafeAreaInsets();
  const dark = tone === "primary";
  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };
  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + 8, backgroundColor: transparent ? "transparent" : dark ? colors.primary : colors.background },
      ]}
    >
      <View style={styles.inner}>
        {back ? (
          <IconButton
            icon="chevron-back"
            label="Quay lại"
            onPress={goBack}
            variant={dark ? "light" : "outline"}
            size={44}
          />
        ) : (
          <View style={{ width: 4 }} />
        )}
        <View style={styles.titleWrap}>
          <Text numberOfLines={1} accessibilityRole="header" style={[styles.title, dark && { color: colors.white }]}>
            {title}
          </Text>
          {!!subtitle && (
            <Text numberOfLines={1} style={[styles.subtitle, dark && { color: "#CFE0F7" }]}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingBottom: 10, zIndex: 10 },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: layout.maxWide,
    alignSelf: "center",
  },
  titleWrap: { flex: 1 },
  title: { fontFamily: fonts.heavy, fontSize: 20, lineHeight: 27, color: colors.ink },
  subtitle: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.inkSoft, marginTop: 1 },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
});

