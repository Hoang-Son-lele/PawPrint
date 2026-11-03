import React, { memo, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

const HEARTS = [
  { left: "14%", delay: 0, size: 35, drift: -20 },
  { left: "35%", delay: 650, size: 31, drift: 17 },
  { left: "58%", delay: 1250, size: 38, drift: -15 },
  { left: "80%", delay: 300, size: 33, drift: 21 },
];
const INNER_HEARTS = [
  { left: "34%", delay: 350, size: 27, drift: -12 },
  { left: "62%", delay: 1050, size: 30, drift: 14 },
];

function Heart({ left, delay, size, drift, inside = false }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: 2600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [inside ? 12 : 34, inside ? -200 : -115],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, drift, drift * 0.35],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.78, 1],
    outputRange: [0, 0.9, 0.75, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0.55, 1, 0.75],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.heart,
        {
          left,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size }]}>♥</Text>
    </Animated.View>
  );
}

function FloatingHearts({ inside = false }) {
  const hearts = inside ? INNER_HEARTS : HEARTS;
  return (
    <View pointerEvents="none" style={styles.layer}>
      {hearts.map((heart) => (
        <Heart key={heart.left} {...heart} inside={inside} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  heart: { position: "absolute", bottom: 8 },
  glyph: {
    color: "#FFC1D8",
    textShadowColor: "rgba(128, 0, 50, 0.28)",
    textShadowRadius: 5,
  },
});

export default memo(FloatingHearts);
