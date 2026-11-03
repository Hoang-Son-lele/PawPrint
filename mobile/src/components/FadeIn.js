import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";
import { motion } from "../theme";
import { useReducedMotion } from "../hooks/useReducedMotion";

/**
 * Xuất hiện bằng fade + trượt nhẹ. Dùng `index` để xuất hiện lần lượt.
 * `from` = "bottom" | "right" | "top" | "scale".
 */
export default function FadeIn({ children, index = 0, delay = 0, from = "bottom", distance = 14, style, trigger }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: motion.slow,
      delay: delay + Math.min(index, 8) * motion.stagger,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    anim.start();
    return () => anim.stop();
  }, [reduced, trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  const transform =
    from === "right"
      ? [{ translateX: offset }]
      : from === "top"
        ? [{ translateY: Animated.multiply(offset, -1) }]
        : from === "scale"
          ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }]
          : [{ translateY: offset }];
  return <Animated.View style={[style, { opacity: progress, transform }]}>{children}</Animated.View>;
}

