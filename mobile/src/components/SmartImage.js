import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Platform, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { useReducedMotion } from "../hooks/useReducedMotion";
import Icon from "./Icon";

/**
 * Ảnh có fade-in, giữ đúng kích thước (không nhảy bố cục) và luôn có ảnh dự phòng
 * khi chưa tải hoặc lỗi. `fallback` = "paw" | "dog" | "cat" | "product" | chuỗi chữ cái.
 */
export default function SmartImage({ uri, style, fallback = "paw", resizeMode = "cover", label, rounded }) {
  const [state, setState] = useState(uri ? "loading" : "empty");
  const opacity = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    setState(uri ? "loading" : "empty");
    opacity.setValue(0);
  }, [uri, opacity]);

  const flat = StyleSheet.flatten(style) || {};
  const size = Math.min(Number(flat.width) || 120, Number(flat.height) || 120);
  const iconSize = Math.max(22, Math.min(56, size * 0.34));
  const fallbackIcon =
    fallback === "dog" ? "mc:dog" : fallback === "cat" ? "mc:cat" : fallback === "product" ? "mc:shopping-outline" : "mc:paw";

  return (
    <View
      style={[styles.box, rounded && { borderRadius: 999 }, style]}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
    >
      {state !== "loaded" && (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          {typeof fallback === "string" && fallback.length <= 2 && !["dog", "cat"].includes(fallback) ? (
            <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{fallback.toUpperCase()}</Text>
          ) : (
            <Icon name={fallbackIcon} size={iconSize} color={state === "loading" ? colors.primaryTint : "#B9C9E2"} />
          )}
        </View>
      )}
      {!!uri && state !== "error" && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode={resizeMode}
            onLoad={() => {
              setState("loaded");
              if (reduced) opacity.setValue(1);
              else
                Animated.timing(opacity, {
                  toValue: 1,
                  duration: 260,
                  useNativeDriver: Platform.OS !== "web",
                }).start();
            }}
            onError={() => setState("error")}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: "hidden", backgroundColor: colors.primarySoft },
  fallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  initials: { fontFamily: fonts.heavy, color: colors.primary },
});

