import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { colors } from "../theme";
import { useReducedMotion } from "../hooks/useReducedMotion";

/* ------------ Họa tiết nhỏ – dùng tiết chế, không che nội dung ------------ */
export function Paw({ size = 24, color = colors.accent, opacity = 1, rotate = 0, style }) {
  return (
    <View style={[{ transform: [{ rotate: `${rotate}deg` }], opacity }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Ellipse cx="12" cy="16" rx="5.2" ry="4.4" fill={color} />
        <Ellipse cx="5.4" cy="10.6" rx="2.2" ry="2.8" fill={color} />
        <Ellipse cx="9.3" cy="6.6" rx="2.2" ry="2.9" fill={color} />
        <Ellipse cx="14.7" cy="6.6" rx="2.2" ry="2.9" fill={color} />
        <Ellipse cx="18.6" cy="10.6" rx="2.2" ry="2.8" fill={color} />
      </Svg>
    </View>
  );
}

export function Star({ size = 16, color = colors.accent, opacity = 1, style }) {
  return (
    <View style={[{ opacity }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 1.5l2.6 7.2 7.4.3-5.8 4.6 2.1 7.2L12 16.6 5.7 20.8l2.1-7.2L2 9l7.4-.3z" fill={color} />
      </Svg>
    </View>
  );
}

export function Sparkle({ size = 14, color = colors.accent, opacity = 1, style }) {
  return (
    <View style={[{ opacity }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 0c1 6 4 9 12 12-8 3-11 6-12 12-1-6-4-9-12-12 8-3 11-6 12-12z" fill={color} />
      </Svg>
    </View>
  );
}

export function Bone({ size = 28, color = colors.accent, opacity = 1, rotate = -20, style }) {
  return (
    <View style={[{ opacity, transform: [{ rotate: `${rotate}deg` }] }, style]} pointerEvents="none">
      <Svg width={size} height={size * 0.5} viewBox="0 0 40 20">
        <Circle cx="6" cy="6" r="5" fill={color} />
        <Circle cx="6" cy="14" r="5" fill={color} />
        <Circle cx="34" cy="6" r="5" fill={color} />
        <Circle cx="34" cy="14" r="5" fill={color} />
        <Rect x="6" y="5" width="28" height="10" rx="4" fill={color} />
      </Svg>
    </View>
  );
}

export function Heart({ size = 18, color = colors.pink, opacity = 1, style }) {
  return (
    <View style={[{ opacity }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2.1 4 6.2 4c2.4 0 4.2 1.4 5.8 3.4C13.6 5.4 15.4 4 17.8 4 21.9 4 23.7 8.4 22 11.7 19.5 16.4 12 21 12 21z" fill={color} />
      </Svg>
    </View>
  );
}

/** Vệt dấu chân đi chéo – trang trí góc. */
export function PawTrail({ color = colors.accent, size = 14, style }) {
  return (
    <View style={[{ width: 70, height: 46 }, style]} pointerEvents="none">
      <Paw size={size} color={color} rotate={30} opacity={0.35} style={{ position: "absolute", left: 0, bottom: 0 }} />
      <Paw size={size} color={color} rotate={30} opacity={0.55} style={{ position: "absolute", left: 22, bottom: 14 }} />
      <Paw size={size} color={color} rotate={30} opacity={0.8} style={{ position: "absolute", left: 44, bottom: 28 }} />
    </View>
  );
}

/** Đường cong mềm phía dưới hero. */
export function Wave({ color = colors.background, height = 26 }) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 400 26" preserveAspectRatio="none" style={{ position: "absolute", bottom: -1, left: 0, right: 0 }}>
      <Path d="M0 26V12C60 0 120 0 200 10s150 12 200-2v18z" fill={color} />
    </Svg>
  );
}

/* ------------------------- Minh họa chó & mèo ------------------------- */
export function DogFace({ size = 90 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Ellipse cx="24" cy="52" rx="15" ry="27" fill="#B87A45" transform="rotate(18 24 52)" />
      <Ellipse cx="96" cy="52" rx="15" ry="27" fill="#B87A45" transform="rotate(-18 96 52)" />
      <Circle cx="60" cy="64" r="40" fill="#F2C38B" />
      <Ellipse cx="60" cy="82" rx="24" ry="18" fill="#FFF3E2" />
      <Ellipse cx="44" cy="40" rx="9" ry="7" fill="#E3A86A" opacity="0.6" />
      <Circle cx="45" cy="60" r="5.5" fill="#0B2F66" />
      <Circle cx="75" cy="60" r="5.5" fill="#0B2F66" />
      <Circle cx="46.8" cy="58" r="1.8" fill="#fff" />
      <Circle cx="76.8" cy="58" r="1.8" fill="#fff" />
      <Ellipse cx="60" cy="74" rx="8" ry="5.5" fill="#0B2F66" />
      <Path d="M52 82c3 4 13 4 16 0" stroke="#0B2F66" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <Path d="M56 85c0 8 8 8 8 0z" fill="#F06A93" />
      <Circle cx="35" cy="74" r="5" fill="#F7A1B5" opacity="0.55" />
      <Circle cx="85" cy="74" r="5" fill="#F7A1B5" opacity="0.55" />
    </Svg>
  );
}

export function CatFace({ size = 90 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path d="M22 50L28 12l30 24z" fill="#8E9AAF" />
      <Path d="M98 50L92 12 62 36z" fill="#8E9AAF" />
      <Path d="M30 42l3-20 14 12z" fill="#F7B6C6" />
      <Path d="M90 42l-3-20-14 12z" fill="#F7B6C6" />
      <Circle cx="60" cy="66" r="40" fill="#B7C1D3" />
      <Path d="M48 32c4 6 4 12 0 16M60 28c0 8 0 14 0 20M72 32c-4 6-4 12 0 16" stroke="#8E9AAF" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Ellipse cx="45" cy="64" rx="6" ry="7" fill="#0B2F66" />
      <Ellipse cx="75" cy="64" rx="6" ry="7" fill="#0B2F66" />
      <Circle cx="47" cy="61.5" r="2" fill="#fff" />
      <Circle cx="77" cy="61.5" r="2" fill="#fff" />
      <Path d="M56 76h8l-4 5z" fill="#F06A93" />
      <Path d="M60 81c-2 5-8 5-10 2M60 81c2 5 8 5 10 2" stroke="#0B2F66" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <Path d="M30 76h14M30 84l14-3M90 76H76M90 84l-14-3" stroke="#F4F6FA" strokeWidth="2" strokeLinecap="round" />
      <Circle cx="35" cy="78" r="5" fill="#F7A1B5" opacity="0.5" />
      <Circle cx="85" cy="78" r="5" fill="#F7A1B5" opacity="0.5" />
    </Svg>
  );
}

/** Chó và mèo chào đón – dùng ở Đăng ký / Đăng nhập. Nhún nhẹ một lần khi xuất hiện. */
export function WelcomePets({ size = 220 }) {
  const reduced = useReducedMotion();
  const dog = useRef(new Animated.Value(reduced ? 0 : 1)).current;
  const cat = useRef(new Animated.Value(reduced ? 0 : 1)).current;
  useEffect(() => {
    if (reduced) return;
    const bounce = (v, delay) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(v, { toValue: 0, speed: 8, bounciness: 14, useNativeDriver: Platform.OS !== "web" }),
      ]);
    Animated.parallel([bounce(dog, 120), bounce(cat, 300)]).start();
  }, [reduced, dog, cat]);
  const face = size * 0.48;
  const lift = (v) => ({ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) }], opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) });
  return (
    <View style={{ width: size, height: size * 0.62, alignItems: "center", justifyContent: "flex-end" }} accessibilityLabel="Minh họa chó và mèo chào đón" accessibilityRole="image">
      <Star size={16} style={{ position: "absolute", left: size * 0.06, top: size * 0.08 }} />
      <Sparkle size={12} color="#FFFFFF" style={{ position: "absolute", right: size * 0.1, top: size * 0.02 }} opacity={0.9} />
      <Heart size={20} style={{ position: "absolute", left: size * 0.45, top: size * 0.04 }} />
      <Bone size={30} color="#FFD58E" style={{ position: "absolute", right: size * 0.02, bottom: size * 0.04 }} />
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Animated.View style={[lift(dog), { marginRight: -size * 0.04 }]}>
          <DogFace size={face} />
        </Animated.View>
        <Animated.View style={lift(cat)}>
          <CatFace size={face * 0.92} />
        </Animated.View>
      </View>
    </View>
  );
}

/** Logo PawPrint – dấu chân trên nền vàng bo tròn. */
export function Logo({ size = 56 }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] }}
      accessibilityLabel="Logo PawPrint"
    >
      <Paw size={size * 0.6} color={colors.primary} />
    </View>
  );
}

/* ------------------------- Chuyển động cảm xúc ------------------------- */

/** 3 dấu chân nảy lần lượt – dùng khi kéo làm mới / đang tải ngắn. */
export function PawLoader({ color = colors.primary, size = 16, label = "Đang làm mới" }) {
  const reduced = useReducedMotion();
  const values = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.stagger(
        140,
        values.map((v) =>
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(v, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
          ]),
        ),
      ),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, values]);
  return (
    <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 10 }} accessibilityLabel={label} accessibilityRole="progressbar">
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            opacity: reduced ? 0.8 : v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }, { rotate: i % 2 ? "14deg" : "-14deg" }],
          }}
        >
          <Paw size={size} color={i === 1 ? colors.accent : color} />
        </Animated.View>
      ))}
    </View>
  );
}

const BURST = Array.from({ length: 14 }).map((_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
    kind: i % 3,
    color: [colors.accent, colors.pink, colors.primary, "#2BA58A"][i % 4],
    rotate: (i * 47) % 360,
  };
});

/** Pháo giấy dấu chân lan tỏa – chạy một lần khi `play` đổi. */
export function PawBurst({ play, radius = 130, size = 16 }) {
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!play || reduced) return;
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start();
  }, [play, reduced, p]);
  if (reduced || !play) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: "50%", top: "40%", width: 0, height: 0 }}>
      {BURST.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            opacity: p.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, b.x * radius] }) },
              { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, b.y * radius + 30] }) },
              { rotate: `${b.rotate}deg` },
              { scale: p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.1, 0.8] }) },
            ],
          }}
        >
          {b.kind === 0 ? <Paw size={size} color={b.color} /> : b.kind === 1 ? <Star size={size - 2} color={b.color} /> : <Heart size={size - 2} color={b.color} />}
        </Animated.View>
      ))}
    </View>
  );
}

export { G };

