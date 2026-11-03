import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { usePets } from "../../context/PetsContext";
import { colors, fonts, radius, shadow } from "../../theme";
import { daysSince, greeting, relativeDate } from "../../utils/format";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import Screen from "../../components/Screen";
import Avatar from "../../components/Avatar";
import PetCard, { AddPetCard } from "../../components/PetCard";
import SectionHeader from "../../components/SectionHeader";
import EmptyState from "../../components/EmptyState";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import SmartImage from "../../components/SmartImage";
import Pressy from "../../components/Pressy";
import FadeIn from "../../components/FadeIn";
import Icon from "../../components/Icon";
import { IconButton } from "../../components/Button";
import { Paw, PawTrail, Sparkle } from "../../components/Decor";

const QUICK = [
  { key: "moment", title: "Lưu khoảnh khắc", sub: "Chụp hoặc chọn ảnh", icon: "camera", bg: colors.accent, fg: colors.primaryDark, path: "/moments?compose=1" },
  { key: "care", title: "Nhật ký chăm sóc", sub: "Cân, tắm, khám…", icon: "mc:heart-pulse", bg: colors.mintSoft, fg: colors.mint, path: "/care" },
  { key: "timeline", title: "Hành trình", sub: "Nhìn lại bên nhau", icon: "mc:timeline-clock-outline", bg: colors.lilacSoft, fg: colors.lilac, path: "/timeline" },
  { key: "shop", title: "Pet Shop", sub: "Mua sắm cho bé", icon: "storefront", bg: colors.primarySoft, fg: colors.primary, path: "/shop" },
];

function WelcomeBanner({ kind, name, onDone }) {
  const reduced = useReducedMotion();
  const p = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!reduced) {
      Animated.parallel([
        Animated.spring(p, { toValue: 1, speed: 10, bounciness: 10, useNativeDriver: Platform.OS !== "web" }),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(hop, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(hop, { toValue: 0, duration: 300, easing: Easing.bounce, useNativeDriver: Platform.OS !== "web" }),
        ]),
      ]).start();
    }
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View
      style={[styles.welcome, { opacity: p, transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Animated.View style={{ transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }] }}>
        <Paw size={34} color={colors.primary} />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={styles.welcomeTitle}>{kind === "new" ? `Chào mừng ${name} đến với PawPrint!` : `Rất vui gặp lại ${name}!`}</Text>
        <Text style={styles.welcomeText}>{kind === "new" ? "Hãy thêm bé đầu tiên để bắt đầu cuốn nhật ký nhé." : "Hôm nay các bé có gì đáng nhớ không?"}</Text>
      </View>
      <IconButton icon="close" label="Đóng lời chào" onPress={onDone} variant="ghost" size={36} color={colors.primaryDark} />
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, refreshUser, welcome, clearWelcome } = useAuth();
  const { pets, status, error, load } = usePets();
  const [reminders, setReminders] = useState([]);
  const [recent, setRecent] = useState({ status: "loading", items: [] });
  const [refreshing, setRefreshing] = useState(false);
  const hello = greeting();
  const firstName = (user?.displayName || "bạn").trim().split(/\s+/).pop();
  const cardW = Math.min(250, Math.max(200, width * 0.58));

  const loadExtras = useCallback(async (list) => {
    api("/notifications")
      .then((r) => setReminders(r.items))
      .catch(() => setReminders([]));
    if (!list?.length) return setRecent({ status: "ready", items: [] });
    try {
      const results = await Promise.all(
        list.slice(0, 4).map((p) =>
          api(`/pets/${p.id}/moments?limit=2`)
            .then((r) => r.items.map((m) => ({ ...m, pet: p })))
            .catch(() => []),
        ),
      );
      const items = results
        .flat()
        .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
        .slice(0, 2);
      setRecent({ status: "ready", items });
    } catch {
      setRecent({ status: "error", items: [] });
    }
  }, []);

  const refresh = useCallback(
    async (pull = false) => {
      if (pull) setRefreshing(true);
      try {
        const list = await load();
        await loadExtras(list);
        refreshUser().catch(() => {});
      } catch {
        /* lỗi hiển thị qua status */
      } finally {
        setRefreshing(false);
      }
    },
    [load, loadExtras, refreshUser],
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <Screen refreshing={refreshing} onRefresh={() => refresh(true)} padded={false} contentStyle={{ paddingTop: 0 }}>
      {/* ---------- Header chào ---------- */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PawTrail style={{ position: "absolute", right: 70, top: insets.top + 6 }} />
        <Pressy onPress={() => router.replace("/profile")} accessibilityLabel="Mở hồ sơ cá nhân" scaleTo={0.92}>
          <Avatar uri={user?.avatarUrl} label={user?.displayName || "Tôi"} size={52} ring />
        </Pressy>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name={hello.icon} size={15} color={colors.accentDark} />
            <Text style={styles.hello}>{hello.text},</Text>
          </View>
          <Text style={styles.name} numberOfLines={1} accessibilityRole="header">
            {firstName}!
          </Text>
        </View>
        <IconButton icon="sparkles-outline" label="Tổng kết tháng" onPress={() => router.push("/insights")} variant="outline" />
      </View>

      <View style={styles.body}>
        {!!welcome && <WelcomeBanner kind={welcome} name={firstName} onDone={clearWelcome} />}

        {/* ---------- Các bé nhà mình ---------- */}
        <SectionHeader
          overline="Gia đình nhỏ"
          title="Các bé nhà mình"
          icon="mc:paw"
          actionLabel={pets.length ? "Thêm bé" : undefined}
          onAction={() => router.push("/pets/new")}
          style={{ marginTop: 14 }}
        />
      </View>
      {status === "loading" && !pets.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petsRow}>
          <LoadingSkeleton variant="petCards" count={2} />
        </ScrollView>
      ) : status === "error" && !pets.length ? (
        <View style={styles.body}>
          <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được các bé" message={error} actionLabel="Thử lại" onAction={() => refresh()} />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petsRow} snapToInterval={cardW + 14} decelerationRate="fast">
          {pets.map((pet, i) => (
            <FadeIn key={pet.id} index={i} from="right" distance={24}>
              <PetCard pet={pet} days={daysSince(pet.adoptedAt)} width={cardW} height={cardW * 1.22} onPress={() => router.push(`/pets/${pet.id}`)} />
            </FadeIn>
          ))}
          <FadeIn index={pets.length} from="right" distance={24}>
            <AddPetCard first={!pets.length} width={pets.length ? 170 : Math.min(width - 36, 520)} height={cardW * 1.22} onPress={() => router.push("/pets/new")} />
          </FadeIn>
        </ScrollView>
      )}

      <View style={styles.body}>
        {/* ---------- Lối vào nhanh ---------- */}
        <SectionHeader overline="Hôm nay làm gì" title="Lối vào nhanh" />
        <View style={styles.quick}>
          {QUICK.map((q, i) => (
            <FadeIn key={q.key} index={i} style={styles.quickCell}>
              <Pressy onPress={() => router.push(q.path)} feedback="light" accessibilityLabel={`${q.title}. ${q.sub}`} style={[styles.quickCard, i === 0 && { backgroundColor: colors.primary }]}>
                <View style={[styles.quickIcon, { backgroundColor: q.bg }]}>
                  <Icon name={q.icon} size={22} color={q.fg} />
                </View>
                <Text style={[styles.quickTitle, i === 0 && { color: colors.white }]}>{q.title}</Text>
                <Text style={[styles.quickSub, i === 0 && { color: "#CFE0F7" }]}>{q.sub}</Text>
                {i === 0 && <Sparkle size={14} style={{ position: "absolute", right: 14, top: 14 }} />}
              </Pressy>
            </FadeIn>
          ))}
        </View>

        {/* ---------- Nhắc nhở chăm sóc ---------- */}
        {reminders.length > 0 && (
          <>
            <SectionHeader overline="Đừng quên nhé" title="Nhắc nhở chăm sóc" />
            {reminders.map((r, i) => (
              <FadeIn key={r.petId} index={i}>
                <Pressy
                  onPress={() => router.push(`/care?petId=${r.petId}&add=weight`)}
                  style={styles.reminder}
                  accessibilityLabel={`${r.petName} đã hơn 30 ngày chưa cập nhật cân nặng. Ghi cân nặng`}
                >
                  <View style={styles.reminderIcon}>
                    <Icon name="mc:scale-bathroom" size={22} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderTitle}>Đến lúc cân {r.petName} rồi!</Text>
                    <Text style={styles.reminderText}>
                      {r.lastWeightAt ? `Lần cân gần nhất: ${relativeDate(r.lastWeightAt)}` : "Bé chưa có lần cân nào được ghi lại."}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.warning} />
                </Pressy>
              </FadeIn>
            ))}
          </>
        )}

        {/* ---------- Khoảnh khắc gần đây ---------- */}
        {pets.length > 0 && (
          <>
            <SectionHeader overline="Mới lưu" title="Khoảnh khắc gần đây" actionLabel="Xem tất cả" onAction={() => router.replace("/moments")} />
            {recent.status === "loading" ? (
              <LoadingSkeleton variant="list" count={2} />
            ) : recent.items.length ? (
              <View style={styles.recentRow}>
                {recent.items.map((m, i) => (
                  <FadeIn key={m.id} index={i} style={{ flex: 1 }}>
                    <Pressy onPress={() => router.replace(`/moments?petId=${m.pet.id}`)} style={styles.recent} accessibilityLabel={`Khoảnh khắc của ${m.pet.name}: ${m.caption || "không có chú thích"}`}>
                      <SmartImage uri={m.photos?.[0]?.url} style={styles.recentImg} fallback={m.pet.species === "cat" ? "cat" : "dog"} />
                      <View style={{ padding: 12 }}>
                        <Text style={styles.recentMeta}>
                          {m.pet.name} · {relativeDate(m.occurredAt)}
                        </Text>
                        <Text numberOfLines={2} style={styles.recentCaption}>
                          {m.caption || "Một ngày đáng nhớ bên bé."}
                        </Text>
                      </View>
                    </Pressy>
                  </FadeIn>
                ))}
              </View>
            ) : (
              <EmptyState
                compact
                icon="camera-outline"
                title="Chưa có khoảnh khắc nào"
                message="Tấm ảnh đầu tiên luôn đặc biệt nhất — lưu lại ngay hôm nay nhé!"
                actionLabel="Lưu khoảnh khắc đầu tiên"
                actionIcon="camera"
                onAction={() => router.push("/moments?compose=1")}
              />
            )}
          </>
        )}

        {/* ---------- Tổng kết ---------- */}
        <Pressy onPress={() => router.push("/insights")} style={styles.insight} accessibilityLabel="Xem tổng kết tháng của các bé">
          <View style={{ flex: 1 }}>
            <Text style={styles.insightOver}>Album tháng này</Text>
            <Text style={styles.insightTitle}>Xem tổng kết tháng của các bé</Text>
          </View>
          <View style={styles.insightIcon}>
            <Icon name="sparkles" size={22} color={colors.primaryDark} />
          </View>
        </Pressy>
        <Text style={styles.footer}>Mỗi dấu chân, một câu chuyện 🐾</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingBottom: 6, width: "100%", maxWidth: 760, alignSelf: "center" },
  hello: { fontFamily: fonts.bold, fontSize: 14, color: colors.inkSoft },
  name: { fontFamily: fonts.black, fontSize: 26, lineHeight: 32, color: colors.ink },
  body: { paddingHorizontal: 18 },
  welcome: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 12,
    ...shadow.soft,
  },
  welcomeTitle: { fontFamily: fonts.black, fontSize: 16, color: colors.primaryDark },
  welcomeText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.primary, marginTop: 2 },
  petsRow: { paddingHorizontal: 18, gap: 14, paddingVertical: 6 },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickCell: { flexBasis: "46%", flexGrow: 1 },
  quickCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, minHeight: 126, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  quickTitle: { fontFamily: fonts.heavy, fontSize: 15.5, color: colors.ink },
  quickSub: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  reminder: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.warningSoft, borderRadius: radius.lg, padding: 14, marginBottom: 10, minHeight: 64 },
  reminderIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  reminderTitle: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  reminderText: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  recentRow: { flexDirection: "row", gap: 12 },
  recent: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  recentImg: { width: "100%", aspectRatio: 1.1 },
  recentMeta: { fontFamily: fonts.heavy, fontSize: 11.5, color: colors.accentDark },
  recentCaption: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.ink, marginTop: 3 },
  insight: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.primary, borderRadius: radius.lg, padding: 18, marginTop: 24 },
  insightOver: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.accent },
  insightTitle: { fontFamily: fonts.heavy, fontSize: 16.5, color: colors.white, marginTop: 3 },
  insightIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  footer: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 26 },
});
