import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow } from "../../theme";
import { Logo, Paw, Sparkle, Star, WelcomePets, Wave } from "../../components/Decor";
import FadeIn from "../../components/FadeIn";
import Icon from "../../components/Icon";
import Button from "../../components/Button";

/** Khung chung cho Đăng ký / Đăng nhập: hero xanh có chó mèo chào đón + thẻ biểu mẫu. */
export default function AuthLayout({ title, subtitle, children, compact = false }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}>
        <View style={[styles.hero, { paddingTop: insets.top + (compact ? 18 : 26) }]}>
          <Paw size={90} color="#FFFFFF" opacity={0.05} rotate={-20} style={{ position: "absolute", left: -18, top: insets.top + 40 }} />
          <Paw size={50} color={colors.accent} opacity={0.18} rotate={18} style={{ position: "absolute", right: 22, top: insets.top + 90 }} />
          <Star size={12} style={{ position: "absolute", left: "22%", top: insets.top + 18 }} opacity={0.7} />
          <Sparkle size={10} color="#FFFFFF" style={{ position: "absolute", right: "30%", top: insets.top + 30 }} opacity={0.8} />
          <View style={styles.brandRow}>
            <Logo size={44} />
            <Text style={styles.brand}>PawPrint</Text>
          </View>
          <Text style={styles.tagline}>Mỗi dấu chân, một câu chuyện</Text>
          <View style={{ marginTop: compact ? 6 : 12 }}>
            <WelcomePets size={compact ? 200 : 240} />
          </View>
          <Wave />
        </View>
        <FadeIn style={styles.cardWrap} delay={120}>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            <View style={{ marginTop: 20 }}>{children}</View>
          </View>
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Banner lỗi có nút thử lại – dùng cho lỗi kết nối. */
export function ErrorBanner({ message, onRetry, retryLabel = "Thử lại" }) {
  if (!message) return null;
  return (
    <FadeIn from="scale" style={styles.banner}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Icon name="cloud-offline-outline" size={22} color={colors.danger} />
        <Text style={styles.bannerText}>{message}</Text>
      </View>
      {onRetry && <Button title={retryLabel} icon="refresh" variant="danger" size="sm" onPress={onRetry} style={{ alignSelf: "flex-start", marginTop: 10 }} />}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, alignItems: "center", paddingBottom: 34, overflow: "hidden" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brand: { fontFamily: fonts.black, fontSize: 28, color: colors.white, letterSpacing: 0.3 },
  tagline: { fontFamily: fonts.bold, fontSize: 15, color: colors.accent, marginTop: 8 },
  cardWrap: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 18, marginTop: -6 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 22, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  title: { fontFamily: fonts.black, fontSize: 25, lineHeight: 32, color: colors.ink },
  subtitle: { fontFamily: fonts.medium, fontSize: 14.5, lineHeight: 22, color: colors.inkSoft, marginTop: 6 },
  banner: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 14, marginBottom: 14 },
  bannerText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.danger },
});

