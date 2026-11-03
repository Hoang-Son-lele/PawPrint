import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/services/api";
import { usePets } from "../../src/context/PetsContext";
import { colors, fonts, radius, shadow } from "../../src/theme";
import { ageText, formatDate, relativeDate, sexLabel, species } from "../../src/utils/format";
import Screen from "../../src/components/Screen";
import SmartImage from "../../src/components/SmartImage";
import SectionHeader from "../../src/components/SectionHeader";
import EmptyState from "../../src/components/EmptyState";
import LoadingSkeleton from "../../src/components/LoadingSkeleton";
import Button, { IconButton } from "../../src/components/Button";
import Pressy from "../../src/components/Pressy";
import FadeIn from "../../src/components/FadeIn";
import Icon from "../../src/components/Icon";
import { Heart, Paw, Sparkle } from "../../src/components/Decor";

export default function PetDetails() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { getPet, upsert } = usePets();
  const cached = getPet(id);
  const [pet, setPet] = useState(cached || null);
  const [together, setTogether] = useState(null);
  const [stats, setStats] = useState(null);
  const [story, setStory] = useState([]);
  const [status, setStatus] = useState(cached ? "ready" : "loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (pull = false) => {
      if (pull) setRefreshing(true);
      setError("");
      try {
        const r = await api(`/pets/${id}`);
        setPet(r.pet);
        upsert(r.pet);
        setStatus("ready");
        const [t, care, moments, milestones] = await Promise.all([
          api(`/pets/${id}/together-days`).catch(() => null),
          api(`/pets/${id}/care-records?limit=100`).catch(() => ({ items: [] })),
          api(`/pets/${id}/moments?limit=100`).catch(() => ({ items: [], hasMore: false })),
          api(`/pets/${id}/timeline?type=milestone&limit=100`).catch(() => ({ items: [] })),
        ]);
        setTogether(t);
        const lastWeight = care.items.find((c) => c.type === "weight" && c.valueDecimal != null);
        setStats({
          weight: lastWeight ? { value: lastWeight.valueDecimal, at: lastWeight.occurredAt } : r.pet.weightKg ? { value: r.pet.weightKg } : null,
          moments: moments.items.length,
          momentsMore: moments.hasMore,
          milestones: milestones.items.length + (r.pet.adoptedAt ? 1 : 0),
        });
        setStory(moments.items.slice(0, 4));
      } catch (e) {
        setError(e.message);
        setStatus((s) => (s === "ready" ? "ready" : e.status === 404 ? "missing" : "error"));
      } finally {
        setRefreshing(false);
      }
    },
    [id, upsert],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const heroH = Math.min(420, Math.max(300, width * 0.92));
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (status === "loading")
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 18, paddingTop: insets.top + 12 }}>
        <LoadingSkeleton variant="hero" />
      </View>
    );
  if (status === "missing" || status === "error")
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 18, paddingTop: insets.top + 60 }}>
        <EmptyState
          tone="error"
          icon={status === "missing" ? "search" : "cloud-offline-outline"}
          title={status === "missing" ? "Không tìm thấy bé" : "Chưa tải được hồ sơ"}
          message={status === "missing" ? "Hồ sơ này có thể đã bị xóa." : error}
          actionLabel={status === "missing" ? "Về trang chủ" : "Thử lại"}
          onAction={status === "missing" ? () => router.replace("/") : () => load()}
        />
      </View>
    );

  const sp = species(pet.species);
  const days = together?.days;
  const next = together?.nextMilestone;
  const progress = next ? Math.max(0.04, 1 - next.remaining / next.days) : 1;

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={() => load(true)} contentStyle={{ paddingTop: 0 }} bottomInset={40}>
      {/* ---------- Hero ---------- */}
      <View style={{ height: heroH }}>
        <SmartImage uri={pet.avatarUrl} style={StyleSheet.absoluteFill} fallback={pet.species === "cat" ? "cat" : pet.species === "dog" ? "dog" : "paw"} label={`Ảnh của ${pet.name}`} />
        <LinearGradient colors={["rgba(7,26,58,0.45)", "rgba(7,26,58,0)", "rgba(7,26,58,0.85)"]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
          <IconButton icon="chevron-back" label="Quay lại" onPress={back} variant="light" />
          <Button title="Chỉnh sửa" icon="create-outline" variant="light" size="sm" onPress={() => router.push(`/pets/${id}/settings`)} accessibilityLabel={`Chỉnh sửa hồ sơ ${pet.name}`} />
        </View>
        <View style={styles.heroBottom}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {sp.emoji} {sp.label}
            </Text>
          </View>
          <Text style={styles.name} accessibilityRole="header">
            {pet.name}
          </Text>
          <Text style={styles.breed}>{[pet.breed, ageText(pet.birthDate)].filter(Boolean).join(" · ") || "Chưa cập nhật giống"}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* ---------- Ngày đồng hành ---------- */}
        <FadeIn style={styles.together}>
          <Heart size={70} color="#FFFFFF" opacity={0.08} style={{ position: "absolute", right: -6, top: -10 }} />
          <Sparkle size={14} style={{ position: "absolute", right: 70, top: 14 }} />
          {days != null ? (
            <>
              <Text style={styles.togetherLabel}>Bên nhau</Text>
              <Text style={styles.togetherDays}>
                {days} <Text style={styles.togetherUnit}>ngày</Text>
              </Text>
              {next ? (
                <>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={styles.togetherNext}>
                    Còn {next.remaining} ngày nữa đến mốc {next.days} ngày 🎉
                  </Text>
                </>
              ) : (
                <Text style={styles.togetherNext}>Đã vượt qua mốc 1000 ngày – thật tuyệt vời!</Text>
              )}
            </>
          ) : (
            <Pressy onPress={() => router.push(`/pets/${id}/settings`)} accessibilityLabel="Thêm ngày về nhà">
              <Text style={styles.togetherLabel}>Ngày đồng hành</Text>
              <Text style={styles.togetherEmpty}>Thêm ngày bé về nhà để đếm từng ngày bên nhau →</Text>
            </Pressy>
          )}
        </FadeIn>

        {/* ---------- Chỉ số ---------- */}
        <View style={styles.stats}>
          {[
            { icon: "mc:scale-bathroom", color: colors.info, label: "Cân nặng", value: stats?.weight ? `${stats.weight.value} kg` : "—", sub: stats?.weight?.at ? relativeDate(stats.weight.at) : "Chưa ghi" },
            { icon: "images", color: colors.accentDark, label: "Khoảnh khắc", value: stats ? `${stats.moments}${stats.momentsMore ? "+" : ""}` : "—", sub: "đã lưu" },
            { icon: "trophy", color: colors.lilac, label: "Mốc đáng nhớ", value: stats ? String(stats.milestones) : "—", sub: "cột mốc" },
          ].map((s, i) => (
            <FadeIn key={s.label} index={i} style={styles.stat}>
              <Icon name={s.icon} size={20} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </FadeIn>
          ))}
        </View>

        {/* ---------- Nút nhanh ---------- */}
        <View style={styles.actions}>
          <Button title="Thêm khoảnh khắc" icon="camera" variant="accent" onPress={() => router.push(`/moments?petId=${id}&compose=1`)} style={{ flexGrow: 1, flexBasis: "100%" }} />
          <Button title="Ghi chăm sóc" icon="medkit-outline" variant="secondary" onPress={() => router.push(`/care?petId=${id}`)} style={{ flex: 1 }} />
          <Button title="Hành trình" icon="git-commit-outline" variant="secondary" onPress={() => router.push(`/timeline?petId=${id}`)} style={{ flex: 1 }} />
        </View>

        {/* ---------- Thông tin ---------- */}
        <SectionHeader overline="Về bé" title="Thông tin hồ sơ" />
        <View style={styles.info}>
          {[
            ["calendar-outline", "Ngày sinh", pet.birthDate ? `${formatDate(pet.birthDate)}${ageText(pet.birthDate) ? ` · ${ageText(pet.birthDate)}` : ""}` : "Chưa cập nhật"],
            ["home-outline", "Ngày về nhà", pet.adoptedAt ? formatDate(pet.adoptedAt) : "Chưa cập nhật"],
            ["male-female-outline", "Giới tính", sexLabel[pet.sex] || "Chưa cập nhật"],
            ["mc:scale-bathroom", "Cân nặng hồ sơ", pet.weightKg ? `${pet.weightKg} kg` : "Chưa cập nhật"],
          ].map(([icon, label, value]) => (
            <View key={label} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Icon name={icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          ))}
          {!!pet.notes && (
            <View style={styles.notes}>
              <Paw size={16} color={colors.accent} />
              <Text style={styles.notesText}>{pet.notes}</Text>
            </View>
          )}
        </View>

        {/* ---------- Câu chuyện của bé ---------- */}
        <SectionHeader overline="Gần đây" title="Câu chuyện của bé" actionLabel={story.length ? "Xem tất cả" : undefined} onAction={() => router.replace(`/moments?petId=${id}`)} />
        {!stats ? (
          <LoadingSkeleton variant="grid" count={2} />
        ) : story.length ? (
          <View style={styles.storyGrid}>
            {story.map((m, i) => (
              <FadeIn key={m.id} index={i} style={styles.storyCell}>
                <Pressy onPress={() => router.replace(`/moments?petId=${id}`)} style={styles.story} accessibilityLabel={`${formatDate(m.occurredAt)}: ${m.caption || "Khoảnh khắc"}`}>
                  <SmartImage uri={m.photos?.[0]?.url} style={styles.storyImg} fallback="paw" />
                  <View style={{ padding: 10 }}>
                    <Text style={styles.storyDate}>{relativeDate(m.occurredAt)}</Text>
                    <Text numberOfLines={2} style={styles.storyCaption}>
                      {m.caption || "Một ngày đáng nhớ bên bé."}
                    </Text>
                  </View>
                </Pressy>
              </FadeIn>
            ))}
          </View>
        ) : (
          <EmptyState compact icon="camera-outline" title={`Câu chuyện của ${pet.name} đang chờ bạn`} message="Lưu khoảnh khắc đầu tiên để bắt đầu cuốn nhật ký." actionLabel="Lưu khoảnh khắc" actionIcon="camera" onAction={() => router.push(`/moments?petId=${id}&compose=1`)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTop: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16 },
  heroBottom: { position: "absolute", left: 20, right: 20, bottom: 40 },
  tag: { alignSelf: "flex-start", backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.primaryDark },
  name: { fontFamily: fonts.black, fontSize: 36, lineHeight: 44, color: colors.white, marginTop: 8 },
  breed: { fontFamily: fonts.bold, fontSize: 15, color: "#E1EBFA" },
  body: { paddingHorizontal: 18, marginTop: -26, width: "100%", maxWidth: 760, alignSelf: "center" },
  together: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: 20, overflow: "hidden", ...shadow.lifted },
  togetherLabel: { fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: colors.accent },
  togetherDays: { fontFamily: fonts.black, fontSize: 42, lineHeight: 50, color: colors.white },
  togetherUnit: { fontFamily: fonts.heavy, fontSize: 18 },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)", marginTop: 10, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, backgroundColor: colors.accent },
  togetherNext: { fontFamily: fonts.bold, fontSize: 13.5, color: "#D7E5FA", marginTop: 8 },
  togetherEmpty: { fontFamily: fonts.bold, fontSize: 15, color: colors.white, marginTop: 6, lineHeight: 22 },
  stats: { flexDirection: "row", gap: 10, marginTop: 14 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border, alignItems: "flex-start" },
  statValue: { fontFamily: fonts.black, fontSize: 19, color: colors.ink, marginTop: 6 },
  statLabel: { fontFamily: fonts.heavy, fontSize: 12, color: colors.ink },
  statSub: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.inkSoft },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  info: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 6, borderWidth: 1, borderColor: colors.border },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, minHeight: 52 },
  infoIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.inkSoft, flex: 1 },
  infoValue: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: "right" },
  notes: { flexDirection: "row", gap: 10, backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 14, margin: 6 },
  notesText: { flex: 1, fontFamily: fonts.medium, fontSize: 14.5, lineHeight: 22, color: colors.ink },
  storyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  storyCell: { flexBasis: "46%", flexGrow: 1 },
  story: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  storyImg: { width: "100%", aspectRatio: 1 },
  storyDate: { fontFamily: fonts.heavy, fontSize: 11.5, color: colors.accentDark },
  storyCaption: { fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 19, color: colors.ink, marginTop: 2 },
});
