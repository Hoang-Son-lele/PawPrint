import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import { colors, radius } from "../theme";
import { useReducedMotion } from "../hooks/useReducedMotion";

/** Khối skeleton có nhịp sáng nhẹ (tắt khi giảm chuyển động). */
export function Skeleton({ width = "100%", height = 16, radius: r = 10, style }) {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, pulse]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: r, backgroundColor: "#EEE7DA", opacity: reduced ? 0.8 : pulse }, style]}
    />
  );
}

/** Skeleton giữ đúng hình dạng nội dung để tránh nhảy bố cục. */
export default function LoadingSkeleton({ variant = "list", count = 3, style }) {
  const items = Array.from({ length: count });
  return (
    <View style={style} accessibilityLabel="Đang tải" accessibilityRole="progressbar">
      {variant === "petCards" && (
        <View style={{ flexDirection: "row", gap: 14 }}>
          {items.map((_, i) => (
            <View key={i} style={[s.card, { width: 220, padding: 0 }]}>
              <Skeleton height={190} radius={0} />
              <View style={{ padding: 14, gap: 8 }}>
                <Skeleton width="60%" height={18} />
                <Skeleton width="80%" height={12} />
              </View>
            </View>
          ))}
        </View>
      )}
      {variant === "grid" && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {items.map((_, i) => (
            <View key={i} style={[s.card, { flexBasis: "46%", flexGrow: 1, padding: 0 }]}>
              <Skeleton height={150} radius={0} />
              <View style={{ padding: 12, gap: 8 }}>
                <Skeleton width="40%" height={10} />
                <Skeleton width="85%" height={15} />
                <Skeleton width="50%" height={17} />
              </View>
            </View>
          ))}
        </View>
      )}
      {variant === "photos" && (
        <View style={{ gap: 14 }}>
          {items.map((_, i) => (
            <View key={i} style={[s.card, { padding: 0 }]}>
              <Skeleton height={260} radius={0} />
              <View style={{ padding: 16, gap: 8 }}>
                <Skeleton width="35%" height={11} />
                <Skeleton width="90%" height={15} />
              </View>
            </View>
          ))}
        </View>
      )}
      {variant === "timeline" && (
        <View style={{ gap: 18 }}>
          {items.map((_, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 14 }}>
              <Skeleton width={40} height={40} radius={20} />
              <View style={[s.card, { flex: 1, gap: 8 }]}>
                <Skeleton width="30%" height={11} />
                <Skeleton width="80%" height={15} />
              </View>
            </View>
          ))}
        </View>
      )}
      {variant === "hero" && (
        <View style={{ gap: 14 }}>
          <Skeleton height={300} radius={radius.xl} />
          <Skeleton width="55%" height={26} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={80} radius={radius.md} style={{ flex: 1 }} />
            ))}
          </View>
        </View>
      )}
      {variant === "form" && (
        <View style={{ gap: 16 }}>
          <Skeleton width={110} height={110} radius={55} style={{ alignSelf: "center" }} />
          {items.map((_, i) => (
            <View key={i} style={{ gap: 8 }}>
              <Skeleton width="30%" height={12} />
              <Skeleton height={52} radius={radius.sm} />
            </View>
          ))}
        </View>
      )}
      {variant === "list" && (
        <View style={{ gap: 12 }}>
          {items.map((_, i) => (
            <View key={i} style={[s.card, { flexDirection: "row", gap: 14, alignItems: "center" }]}>
              <Skeleton width={56} height={56} radius={16} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="60%" height={15} />
                <Skeleton width="40%" height={12} />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
});

