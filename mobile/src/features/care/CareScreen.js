import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../services/api";
import { usePets } from "../../context/PetsContext";
import { colors, fonts, radius, shadow } from "../../theme";
import { careKinds, dateKey, formatDate, relativeDate } from "../../utils/format";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import SectionHeader from "../../components/SectionHeader";
import { FilterChipRow } from "../../components/FilterChip";
import EmptyState from "../../components/EmptyState";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import WeightChart from "../../components/WeightChart";
import Pressy from "../../components/Pressy";
import FadeIn from "../../components/FadeIn";
import Icon from "../../components/Icon";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/Toast";
import CareForm from "./CareForm";

export default function CareScreen() {
  const params = useLocalSearchParams();
  const toast = useToast();
  const { pets, status: petStatus, activePetId, setActivePetId, load: loadPets } = usePets();
  const petId = params.petId && pets.some((p) => p.id === params.petId) ? params.petId : activePetId || pets[0]?.id;
  const pet = pets.find((p) => p.id === petId);
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(null); // { type } | { record }
  const [fresh, setFresh] = useState(null);

  const load = useCallback(async () => {
    if (!petId) return setStatus("ready");
    setError("");
    try {
      const r = await api(`/pets/${petId}/care-records?limit=100`);
      setRecords(r.items);
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus((s) => (s === "ready" ? s : "error"));
    }
  }, [petId]);

  useFocusEffect(
    useCallback(() => {
      setStatus("loading");
      load();
    }, [load]),
  );
  useEffect(() => {
    if (params.add && careKinds[params.add] && pet) setForm({ type: params.add });
  }, [params.add, pet?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const choosePet = (id) => {
    setActivePetId(id);
    if (params.petId) router.setParams({ petId: id, add: undefined });
  };

  const summary = useMemo(() => {
    const latest = (t) => records.find((r) => r.type === t);
    const weights = records.filter((r) => r.type === "weight" && r.valueDecimal != null);
    return {
      weight: weights[0],
      prevWeight: weights[1],
      bath: latest("bath"),
      vet: latest("vet"),
      nails: latest("nails"),
      chart: weights
        .slice(0, 24)
        .map((w) => ({ date: w.occurredAt, value: Number(w.valueDecimal) }))
        .reverse(),
    };
  }, [records]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      const k = dateKey(r.occurredAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    return [...map.entries()];
  }, [records]);

  const onSaved = async (id, type) => {
    setForm(null);
    toast.success(`Đã lưu: ${careKinds[type]?.label || "bản ghi"} của ${pet?.name}`);
    setFresh(id);
    await load();
    setTimeout(() => setFresh(null), 2400);
  };

  const header = <ScreenHeader back={false} title="Chăm sóc" subtitle={pet ? `Sức khỏe & thói quen của ${pet.name}` : "Nhật ký sức khỏe của các bé"} />;
  const delta = summary.weight && summary.prevWeight ? Number(summary.weight.valueDecimal) - Number(summary.prevWeight.valueDecimal) : null;

  return (
    <>
      <Screen
        header={header}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await loadPets().catch(() => {});
          await load();
          setRefreshing(false);
        }}
      >
        {petStatus === "ready" && !pets.length ? (
          <EmptyState emoji="🩺" title="Chưa có bé nào để chăm sóc" message="Tạo hồ sơ cho bé để bắt đầu ghi cân nặng, lịch tắm và khám thú y." actionLabel="Thêm bé" actionIcon="add" onAction={() => router.push("/pets/new")} />
        ) : (
          <>
            {pets.length > 1 && (
              <FilterChipRow options={pets.map((p) => ({ id: p.id, label: p.name }))} value={petId} onChange={choosePet} style={{ marginBottom: 12 }} />
            )}

            {/* ---------- Tổng quan ---------- */}
            {pet && (
              <FadeIn style={styles.overview}>
                <View style={styles.ovHead}>
                  <Avatar uri={pet.avatarUrl} label={pet.name} size={46} ring />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ovOver}>Tổng quan chăm sóc</Text>
                    <Text style={styles.ovName}>{pet.name}</Text>
                  </View>
                </View>
                <View style={styles.ovRow}>
                  {[
                    { k: "weight", label: "Cân nặng gần nhất", value: summary.weight ? `${summary.weight.valueDecimal} kg` : "Chưa ghi", sub: summary.weight ? relativeDate(summary.weight.occurredAt) : "Ghi lần đầu nhé" },
                    { k: "bath", label: "Lần tắm gần nhất", value: summary.bath ? relativeDate(summary.bath.occurredAt) : "Chưa ghi", sub: summary.bath ? formatDate(summary.bath.occurredAt, { year: false }) : "" },
                    { k: "vet", label: "Lần khám gần nhất", value: summary.vet ? relativeDate(summary.vet.occurredAt) : "Chưa ghi", sub: summary.vet ? formatDate(summary.vet.occurredAt, { year: false }) : "" },
                  ].map((s) => (
                    <View key={s.k} style={styles.ovCell}>
                      <Icon name={`mc:${careKinds[s.k].icon}`} size={18} color={colors.accent} />
                      <Text style={styles.ovValue} numberOfLines={1}>
                        {s.value}
                      </Text>
                      <Text style={styles.ovLabel}>{s.label}</Text>
                      {!!s.sub && <Text style={styles.ovSub}>{s.sub}</Text>}
                    </View>
                  ))}
                </View>
                {delta != null && Math.abs(delta) > 0.001 && (
                  <View style={styles.delta}>
                    <Icon name={delta > 0 ? "trending-up" : "trending-down"} size={16} color={colors.primaryDark} />
                    <Text style={styles.deltaText}>
                      {delta > 0 ? "Tăng" : "Giảm"} {Math.abs(delta).toFixed(2)} kg so với lần cân trước
                    </Text>
                  </View>
                )}
              </FadeIn>
            )}

            {/* ---------- Hành động nhanh ---------- */}
            <SectionHeader overline="Ghi nhanh" title="Hôm nay bé được…" />
            <View style={styles.quick}>
              {Object.entries(careKinds).map(([id, k], i) => (
                <FadeIn key={id} index={i} style={styles.quickCell}>
                  <Pressy onPress={() => setForm({ type: id })} disabled={!pet} feedback="light" scaleTo={0.93} accessibilityLabel={`Ghi ${k.label}`} style={[styles.quickBtn, { backgroundColor: k.soft }]}>
                    <View style={[styles.quickIcon, { backgroundColor: k.color }]}>
                      <Icon name={`mc:${k.icon}`} size={20} color={colors.white} />
                    </View>
                    <Text style={styles.quickText}>{k.label}</Text>
                  </Pressy>
                </FadeIn>
              ))}
            </View>

            {/* ---------- Biểu đồ cân nặng ---------- */}
            {summary.chart.length > 0 && (
              <>
                <SectionHeader overline="Theo dõi" title="Biểu đồ cân nặng" />
                <View style={styles.card}>
                  <WeightChart points={summary.chart} />
                  <Text style={styles.chartHint}>Chạm vào một điểm để xem số liệu.</Text>
                </View>
              </>
            )}

            {/* ---------- Nhật ký ---------- */}
            <SectionHeader overline="Nhật ký" title="Các lần chăm sóc" />
            {status === "loading" ? (
              <LoadingSkeleton variant="list" count={3} />
            ) : status === "error" ? (
              <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được nhật ký" message={error} actionLabel="Thử lại" onAction={load} />
            ) : !records.length ? (
              <EmptyState compact icon="mc:heart-pulse" title={`Nhật ký của ${pet?.name || "bé"} còn trống`} message="Bắt đầu với lần cân đầu tiên để theo dõi bé lớn lên từng ngày." actionLabel="Ghi cân nặng" actionIcon="add" onAction={() => setForm({ type: "weight" })} />
            ) : (
              groups.map(([day, list], gi) => (
                <View key={day} style={{ marginBottom: 10 }}>
                  <Text style={styles.day}>{formatDate(day, { weekday: true })}</Text>
                  {list.map((r, i) => {
                    const k = careKinds[r.type] || careKinds.note;
                    return (
                      <FadeIn key={r.id} index={gi + i} from={r.id === fresh ? "right" : "bottom"} distance={r.id === fresh ? 40 : 14} trigger={r.id === fresh ? fresh : undefined}>
                        <Pressy onPress={() => setForm({ record: r })} scaleTo={0.98} accessibilityLabel={`${k.label}${r.valueDecimal != null ? ` ${r.valueDecimal} kg` : ""}. ${r.note || ""}. Chạm để sửa`} style={[styles.record, r.id === fresh && styles.fresh]}>
                          <View style={[styles.recIcon, { backgroundColor: k.soft }]}>
                            <Icon name={`mc:${k.icon}`} size={22} color={k.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <Text style={styles.recTitle}>{k.label}</Text>
                              {r.valueDecimal != null && (
                                <View style={[styles.recValue, { backgroundColor: k.soft }]}>
                                  <Text style={[styles.recValueText, { color: k.color }]}>{r.valueDecimal} kg</Text>
                                </View>
                              )}
                            </View>
                            {!!r.note && (
                              <Text style={styles.recNote} numberOfLines={3}>
                                {r.note}
                              </Text>
                            )}
                          </View>
                          <Icon name="create-outline" size={18} color={colors.muted} />
                        </Pressy>
                      </FadeIn>
                    );
                  })}
                </View>
              ))
            )}
          </>
        )}
      </Screen>
      {pet && (
        <CareForm
          visible={!!form}
          onClose={() => setForm(null)}
          pet={pet}
          record={form?.record}
          initialType={form?.type || "weight"}
          onSaved={onSaved}
          onDeleted={(id) => {
            setForm(null);
            setRecords((list) => list.filter((r) => r.id !== id));
            toast.info("Đã xóa bản ghi");
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overview: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: 18, ...shadow.lifted },
  ovHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  ovOver: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.accent },
  ovName: { fontFamily: fonts.black, fontSize: 20, color: colors.white },
  ovRow: { flexDirection: "row", gap: 8 },
  ovCell: { flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: radius.md, padding: 10 },
  ovValue: { fontFamily: fonts.black, fontSize: 15.5, color: colors.white, marginTop: 6 },
  ovLabel: { fontFamily: fonts.bold, fontSize: 11, color: "#C5D7F3", marginTop: 2 },
  ovSub: { fontFamily: fonts.medium, fontSize: 10.5, color: "#9DB7E0" },
  delta: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginTop: 12 },
  deltaText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.primaryDark },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCell: { flexBasis: "30%", flexGrow: 1 },
  quickBtn: { minHeight: 92, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: 8, padding: 10 },
  quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  quickText: { fontFamily: fonts.heavy, fontSize: 13, color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  chartHint: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 4 },
  day: { fontFamily: fonts.heavy, fontSize: 13, color: colors.accentDark, marginBottom: 8, marginTop: 4 },
  record: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border, minHeight: 64 },
  fresh: { borderColor: colors.accent, borderWidth: 2 },
  recIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  recTitle: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  recValue: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  recValueText: { fontFamily: fonts.black, fontSize: 12.5 },
  recNote: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 20, color: colors.inkSoft, marginTop: 3 },
});

