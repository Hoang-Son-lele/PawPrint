import React, { useCallback, useMemo, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../services/api";
import { usePets } from "../../context/PetsContext";
import { colors, fonts, radius, shadow } from "../../theme";
import { dateKey, formatDate, parseDate } from "../../utils/format";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import SectionHeader from "../../components/SectionHeader";
import { FilterChipRow } from "../../components/FilterChip";
import EmptyState from "../../components/EmptyState";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import WeightChart from "../../components/WeightChart";
import SmartImage from "../../components/SmartImage";
import BottomSheet from "../../components/BottomSheet";
import Button, { IconButton } from "../../components/Button";
import Pressy from "../../components/Pressy";
import FadeIn from "../../components/FadeIn";
import Icon from "../../components/Icon";
import { Paw, Sparkle, Star } from "../../components/Decor";

const inMonth = (value, y, m) => {
  const d = parseDate(value);
  return d && d.getFullYear() === y && d.getMonth() + 1 === m;
};

export default function InsightsScreen() {
  const params = useLocalSearchParams();
  const { pets, activePetId, setActivePetId, status: petStatus } = usePets();
  const petId = params.petId && pets.some((p) => p.id === params.petId) ? params.petId : activePetId || pets[0]?.id;
  const pet = pets.find((p) => p.id === petId);
  const now = new Date();
  const [period, setPeriod] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [picker, setPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(period.y);
  const [data, setData] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!petId) return setStatus("ready");
    setStatus("loading");
    setError("");
    try {
      const [recap, moments, care, notes] = await Promise.all([
        api(`/pets/${petId}/recaps?year=${period.y}&month=${period.m}`),
        api(`/pets/${petId}/moments?limit=100`).catch(() => ({ items: [] })),
        api(`/pets/${petId}/care-records?limit=100`).catch(() => ({ items: [] })),
        api("/notifications").catch(() => ({ items: [] })),
      ]);
      const monthMoments = moments.items.filter((x) => inMonth(x.occurredAt, period.y, period.m));
      const monthCare = care.items.filter((x) => inMonth(x.occurredAt, period.y, period.m));
      const activity = new Map();
      for (const x of monthMoments) activity.set(dateKey(x.occurredAt), { ...(activity.get(dateKey(x.occurredAt)) || { m: 0, c: 0 }), m: (activity.get(dateKey(x.occurredAt))?.m || 0) + 1 });
      for (const x of monthCare) activity.set(dateKey(x.occurredAt), { ...(activity.get(dateKey(x.occurredAt)) || { m: 0, c: 0 }), c: (activity.get(dateKey(x.occurredAt))?.c || 0) + 1 });
      const activeDays = [...activity.entries()].map(([day, v]) => ({ day, ...v, total: v.m + v.c })).sort((a, b) => b.total - a.total || b.day.localeCompare(a.day));
      setData({
        ...recap,
        photos: monthMoments.filter((x) => x.photos?.[0]?.url).slice(0, 6),
        activeDays,
        chart: recap.weights.map((w) => ({ date: w.occurredAt, value: Number(w.weightKg) })),
      });
      setReminders(notes.items.filter((n) => String(n.petId).toLowerCase() === String(petId).toLowerCase()));
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }, [petId, period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const isFuture = (y, m) => y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1);
  const shift = (n) => {
    const d = new Date(period.y, period.m - 1 + n, 1);
    if (!isFuture(d.getFullYear(), d.getMonth() + 1)) setPeriod({ y: d.getFullYear(), m: d.getMonth() + 1 });
  };

  const weightChange = useMemo(() => {
    if (!data?.chart?.length || data.chart.length < 2) return null;
    return data.chart[data.chart.length - 1].value - data.chart[0].value;
  }, [data]);
  const total = data ? Number(data.moments) + Number(data.careRecords) : 0;

  const share = () => {
    if (!data || !pet) return;
    const lines = [
      `🐾 Tháng ${period.m}/${period.y} của ${pet.name} trên PawPrint`,
      `📸 ${data.moments} khoảnh khắc`,
      `🩺 ${data.careRecords} lần chăm sóc`,
      weightChange != null ? `⚖️ Cân nặng ${weightChange >= 0 ? "tăng" : "giảm"} ${Math.abs(weightChange).toFixed(2)} kg` : null,
      "Mỗi dấu chân, một câu chuyện 💛",
    ].filter(Boolean);
    Share.share({ message: lines.join("\n") }).catch(() => {});
  };

  return (
    <Screen
      header={<ScreenHeader title="Tổng kết tháng" subtitle="Album nhỏ của từng tháng" right={data && total > 0 ? <IconButton icon="share-social-outline" label="Chia sẻ bản tổng kết" onPress={share} variant="outline" /> : null} />}
      bottomInset={60}
    >
      {petStatus === "ready" && !pets.length ? (
        <EmptyState emoji="📔" title="Album tháng đang chờ bé đầu tiên" message="Thêm hồ sơ bé để PawPrint tổng hợp khoảnh khắc và chăm sóc mỗi tháng." actionLabel="Thêm bé" onAction={() => router.push("/pets/new")} />
      ) : (
        <>
          {pets.length > 1 && <FilterChipRow options={pets.map((p) => ({ id: p.id, label: p.name }))} value={petId} onChange={setActivePetId} style={{ marginBottom: 10 }} />}
          <View style={styles.monthBar}>
            <IconButton icon="chevron-back" label="Tháng trước" onPress={() => shift(-1)} variant="outline" />
            <Pressy onPress={() => { setPickerYear(period.y); setPicker(true); }} style={styles.monthBtn} accessibilityLabel={`Tháng ${period.m} năm ${period.y}. Chạm để chọn tháng và năm`}>
              <Icon name="calendar" size={18} color={colors.primary} />
              <Text style={styles.monthText}>
                Tháng {period.m}, {period.y}
              </Text>
              <Icon name="chevron-down" size={16} color={colors.primary} />
            </Pressy>
            <IconButton icon="chevron-forward" label="Tháng sau" onPress={() => shift(1)} variant="outline" disabled={isFuture(period.m === 12 ? period.y + 1 : period.y, period.m === 12 ? 1 : period.m + 1)} />
          </View>

          {status === "loading" ? (
            <LoadingSkeleton variant="hero" />
          ) : status === "error" ? (
            <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được bản tổng kết" message={error} actionLabel="Thử lại" onAction={load} />
          ) : data && pet ? (
            <>
              {/* ---------- Trang album ---------- */}
              <FadeIn from="scale" style={styles.album}>
                <Star size={14} style={{ position: "absolute", left: 18, top: 16 }} />
                <Sparkle size={12} color="#FFFFFF" style={{ position: "absolute", right: 24, top: 22 }} opacity={0.8} />
                <Paw size={70} color="#FFFFFF" opacity={0.06} rotate={-20} style={{ position: "absolute", right: -10, bottom: -6 }} />
                <Text style={styles.albumOver}>Album tháng {period.m}</Text>
                <Text style={styles.albumTitle} accessibilityRole="header">
                  Tháng {period.m} của {pet.name}
                </Text>
                {data.photos.length > 0 ? (
                  <View style={styles.collage}>
                    {data.photos.slice(0, 3).map((p, i) => (
                      <View key={p.id} style={[styles.polaroid, { transform: [{ rotate: ["-6deg", "3deg", "-2deg"][i] }] }, i === 1 && { marginTop: -8 }]}>
                        <SmartImage uri={p.photos[0].url} style={styles.polaroidImg} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.albumEmpty}>{total ? "Tháng này chưa có ảnh, nhưng bé vẫn được chăm sóc chu đáo 💛" : "Một trang album mới đang chờ được viết."}</Text>
                )}
              </FadeIn>

              {/* ---------- Con số chính ---------- */}
              <View style={styles.stats}>
                {[
                  { icon: "images", color: colors.accentDark, bg: colors.accentSoft, value: data.moments, label: "Khoảnh khắc" },
                  { icon: "mc:heart-pulse", color: colors.mint, bg: colors.mintSoft, value: data.careRecords, label: "Lần chăm sóc" },
                  { icon: "mc:scale-bathroom", color: colors.info, bg: colors.infoSoft, value: weightChange == null ? "—" : `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(2)}`, label: weightChange == null ? "Cần ≥2 lần cân" : "Thay đổi (kg)" },
                ].map((s, i) => (
                  <FadeIn key={s.label} index={i} style={[styles.stat, { backgroundColor: s.bg }]}>
                    <Icon name={s.icon} size={20} color={s.color} />
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </FadeIn>
                ))}
              </View>

              {total === 0 && (
                <EmptyState
                  compact
                  emoji="🌱"
                  title="Tháng này còn nhiều trang trống"
                  message={`Không sao cả! Mỗi ngày đều là cơ hội để lưu một kỷ niệm mới cùng ${pet.name}.`}
                  actionLabel="Lưu khoảnh khắc"
                  actionIcon="camera"
                  onAction={() => router.push(`/moments?petId=${pet.id}&compose=1`)}
                  secondaryLabel="Ghi chăm sóc"
                  onSecondary={() => router.push(`/care?petId=${pet.id}`)}
                  style={{ marginTop: 14 }}
                />
              )}

              {reminders.length > 0 && (
                <View style={styles.reminder}>
                  <Icon name="notifications" size={20} color={colors.warning} />
                  <Text style={styles.reminderText}>Đã hơn 30 ngày chưa cập nhật cân nặng của {pet.name}.</Text>
                  <Button title="Ghi ngay" size="sm" variant="accent" onPress={() => router.push(`/care?petId=${pet.id}&add=weight`)} />
                </View>
              )}

              {data.chart.length > 0 && (
                <>
                  <SectionHeader overline="Sức khỏe" title="Cân nặng trong tháng" />
                  <View style={styles.card}>
                    <WeightChart points={data.chart} />
                  </View>
                </>
              )}

              {data.activeDays.length > 0 && (
                <>
                  <SectionHeader overline="Rộn ràng nhất" title="Ngày hoạt động nổi bật" />
                  {data.activeDays.slice(0, 3).map((d, i) => (
                    <FadeIn key={d.day} index={i} style={styles.dayRow}>
                      <View style={[styles.rank, i === 0 && { backgroundColor: colors.accent }]}>
                        <Text style={styles.rankText}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayTitle}>{formatDate(d.day, { weekday: true, year: false })}</Text>
                        <Text style={styles.daySub}>{[d.m && `${d.m} khoảnh khắc`, d.c && `${d.c} lần chăm sóc`].filter(Boolean).join(" · ")}</Text>
                      </View>
                    </FadeIn>
                  ))}
                </>
              )}

              {data.photos.length > 0 && (
                <>
                  <SectionHeader overline="Đáng nhớ" title="Ảnh của tháng" actionLabel="Xem tất cả" onAction={() => router.replace(`/moments?petId=${pet.id}`)} />
                  <View style={styles.photoGrid}>
                    {data.photos.map((p, i) => (
                      <FadeIn key={p.id} index={i} from="scale" style={styles.photoCell}>
                        <SmartImage uri={p.photos[0].url} style={styles.photo} label={p.caption || `Ảnh ngày ${formatDate(p.occurredAt)}`} />
                      </FadeIn>
                    ))}
                  </View>
                </>
              )}
              {total > 0 && <Button title="Chia sẻ bản tổng kết" icon="share-social-outline" variant="secondary" onPress={share} style={{ marginTop: 20 }} full />}
            </>
          ) : null}
        </>
      )}

      <BottomSheet visible={picker} onClose={() => setPicker(false)} title="Chọn tháng" scroll={false}>
        <View style={styles.yearRow}>
          <IconButton icon="chevron-back" label="Năm trước" onPress={() => setPickerYear((y) => y - 1)} variant="outline" />
          <Text style={styles.yearText}>{pickerYear}</Text>
          <IconButton icon="chevron-forward" label="Năm sau" onPress={() => setPickerYear((y) => y + 1)} variant="outline" disabled={pickerYear >= now.getFullYear()} />
        </View>
        <View style={styles.monthGrid}>
          {Array.from({ length: 12 }).map((_, i) => {
            const m = i + 1;
            const active = period.y === pickerYear && period.m === m;
            const disabled = isFuture(pickerYear, m);
            return (
              <Pressy
                key={m}
                disabled={disabled}
                onPress={() => {
                  setPeriod({ y: pickerYear, m });
                  setPicker(false);
                }}
                accessibilityState={{ selected: active, disabled }}
                accessibilityLabel={`Tháng ${m} năm ${pickerYear}`}
                style={[styles.monthCell, active && styles.monthCellActive, disabled && { opacity: 0.35 }]}
              >
                <Text style={[styles.monthCellText, active && { color: colors.white }]}>Th {m}</Text>
              </Pressy>
            );
          })}
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  monthBtn: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.primarySoft },
  monthText: { fontFamily: fonts.heavy, fontSize: 16, color: colors.primary },
  album: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: 20, paddingBottom: 26, overflow: "hidden", ...shadow.lifted },
  albumOver: { fontFamily: fonts.heavy, fontSize: 11.5, letterSpacing: 1.3, textTransform: "uppercase", color: colors.accent, marginTop: 6 },
  albumTitle: { fontFamily: fonts.black, fontSize: 28, lineHeight: 36, color: colors.white, marginTop: 4 },
  albumEmpty: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 22, color: "#D3E2F8", marginTop: 10 },
  collage: { flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 18 },
  polaroid: { backgroundColor: colors.white, padding: 6, paddingBottom: 18, borderRadius: 6, ...shadow.soft },
  polaroidImg: { width: 86, height: 86, borderRadius: 3 },
  stats: { flexDirection: "row", gap: 10, marginTop: 14 },
  stat: { flex: 1, borderRadius: radius.lg, padding: 14 },
  statValue: { fontFamily: fonts.black, fontSize: 24, color: colors.ink, marginTop: 6 },
  statLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.inkSoft },
  reminder: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.warningSoft, borderRadius: radius.lg, padding: 14, marginTop: 14 },
  reminderText: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 19, color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  dayRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  rank: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  rankText: { fontFamily: fonts.black, fontSize: 15, color: colors.primaryDark },
  dayTitle: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  daySub: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoCell: { flexBasis: "31%", flexGrow: 1 },
  photo: { width: "100%", aspectRatio: 1, borderRadius: radius.md },
  yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  yearText: { fontFamily: fonts.black, fontSize: 22, color: colors.ink },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthCell: { flexBasis: "22%", flexGrow: 1, minHeight: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  monthCellActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthCellText: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
});

