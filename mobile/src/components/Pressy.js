import React, { useRef, useState } from "react";
import { Animated, Platform, Pressable } from "react-native";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { haptic } from "../utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Vùng chạm có phản hồi: thu nhỏ rất nhẹ rồi trở lại.
 * `style` và `children` có thể là hàm nhận `{ pressed }`.
 * `feedback` = "tap" | "light" | "medium" | false – rung nhẹ trên mobile.
 */
export default function Pressy({
  children,
  style,
  onPress,
  scaleTo = 0.97,
  feedback = false,
  disabled,
  accessibilityRole = "button",
  accessibilityState,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const animate = (to) => {
    if (reduced) return;
    Animated.spring(scale, {
      toValue: to,
      speed: 40,
      bounciness: to === 1 ? 7 : 0,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  const state = { pressed };
  return (
    <AnimatedPressable
      onPress={(e) => {
        if (feedback) haptic[feedback]?.();
        onPress?.(e);
      }}
      onPressIn={() => {
        setPressed(true);
        animate(scaleTo);
      }}
      onPressOut={() => {
        setPressed(false);
        animate(1);
      }}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      style={[typeof style === "function" ? style(state) : style, { transform: [{ scale }] }]}
      {...rest}
    >
      {typeof children === "function" ? children(state) : children}
    </AnimatedPressable>
  );
}
