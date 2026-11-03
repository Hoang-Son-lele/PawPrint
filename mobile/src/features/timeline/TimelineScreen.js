import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../services/api";
import { usePets } from "../../context/PetsContext";
import { colors, fonts, radius, shadow } from "../../theme";
import { careKinds, formatDate, parseDate } from "../../utils/format";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import { FilterChipRow } from "../../components/FilterChip";
import EmptyState from "../../components/EmptyState";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import SmartImage from "../../components/SmartImage";
import Button from "../../components/Button";
import FadeIn from "../../components/FadeIn";
import Icon from "../../components/Icon";
import { Sparkle } from "../../components/Decor";

const FILTERS = [
  { id: "all", label: "Tất cả", icon: "apps-outline" },
  { id: "moment", label: "Khoảnh khắc", icon: "images-outline" },
  { id: "care", label: "Chăm sóc", icon: "medkit-outline" },
  { id: "milestone", label: "Cột mốc", icon: "trophy-outline" },
];

function describe(e) {
  if (e.type === "care") {
    const [kind, ...rest] = String(e.title || "").split(" ");
    const k = careKinds[kind] || careKinds.note;
    return { title: k.label, detail: rest.join(" ").replace(/^·\s*/, "· ").trim(), icon: `mc:${k.icon}`, color: k.color, soft: k.soft };
  }
  if (e.type === "milestone") return { title: e.title, detail: e.detail, icon: e.home ? "home" : "trophy", color: colors.accentDark, soft: colors.accentSoft };
  return { title: e.title || "Một khoảnh khắc đáng nhớ", icon: "camera", color: colors.primary, soft: colors.primarySoft };
}

export default function TimelineScreen() {
  const params = useLocalSearchParams();
  const { pets, activePetId, setActivePetId, status: petStatus } = usePets();
  const petId = params.petId && pets.some((p) => p.id === params.petId) ? params.petId : activePetId || pets[0]?.id;
  const pet = pets.find((p) => p.id === petId);
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [photos, setPhotos] = useState({});
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const gen = useRef(0);

  const load = useCallback(
    async (next = 1) => {
      if (!petId) return setStatus("ready");
      const g = ++gen.current;
      if (next === 1) setStatus("loading");
      else setLoadingMore(true);
      setError("");
      try {
        const [r, m] = await Promise.all([
          api(`/pets/${petId}/timeline?type=${filter}&page=${next}&limit=20`),
          next === 1 && filter !== "care" && filter !== "milestone" ? api(`/pets/${petId}/moments?limit=100`).catch(() => ({ items: [] })) : Promise.resolve(null),
        ]);
        if (g !== gen.current) return;
        if (m) setPhotos(Object.fromEntries(m.items.map((x) => [String(x.id).toLowerCase(), x.photos?.[0]?.url])));
        setItems((old) => (next === 1 ? r.items : [...old, ...r.items]));
        setMore(r.hasMore);
        setPage(next);
        setStatus("ready");
      } catch (e) {
        if (g !== gen.current) return;
        setError(e.message);
        setStatus(next === 1 ? "error" : "ready");
      } finally {
        if (g === gen.current) setLoadingMore(false);
      }
    },
    [petId, filter],
  );

  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load]),
  );

  // Ghép "Ngày đầu về nhà" (từ hồ sơ) vào đúng vị trí thời gian.
  const events = useMemo(() => {
    const list = [...items];
    if (pet?.adoptedAt && (filter === "all" || filter === "milestone") && !more) {
      list.push({ id: `home-${pet.id}`, type: "milestone", home: true, title: "Ngày đầu về nhà", detail: `${pet.name} chính thức trở thành thành viên gia đình 🏡`, occurredAt: pet.adoptedAt });
    }
    const sorted = list.sort((a, b) => (parseDate(b.occurredAt) || 0) - (parseDate(a.occurredAt) || 0));
    const out = [];
    let month = "";
    for (const e of sorted) {
      const d = parseDate(e.occurredAt);
      const key = d ? `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}` : "";
      if (key !== month) {
        month = key;
        out.push({ header: key, id: `h-${key}` });
      }
      out.push(e);
    }
    return out;
  }, [items, pet, filter, more]);

  return (
    <Screen header={<ScreenHeader title="Hành trình" subtitle={pet ? `Những ngày bên ${pet.name}` : undefined} />} bottomInset={60}>
      {petStatus === "ready" && !pets.length ? (
        <EmptyState emoji="🗓️" title="Hành trình bắt đầu từ hồ sơ đầu tiên" message="Thêm bé để PawPrint ghi lại từng khoảnh khắc, lần chăm sóc và cột mốc." actionLabel="Thêm bé" onAction={() => router.push("/pets/new")} />
      ) : (
        <>
          {pets.length > 1 && (
            <FilterChipRow options={pets.map((p) => ({ id: p.id, label: p.name }))} value={petId} onChange={(id) => { setActivePetId(id); if (params.petId) router.setParams({ petId: id }); }} style={{ marginBottom: 6 }} />
          )}
          <FilterChipRow options={FILTERS} value={filter} onChange={setFilter} tone="accent" style={{ marginBottom: 14 }} />
          {status === "loading" ? (
            <LoadingSkeleton variant="timeline" count={4} />
          ) : status === "error" ? (
            <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được hành trình" message={error} actionLabel="Thử lại" onAction={() => load(1)} />
          ) : !events.length ? (
            <EmptyState
              icon={FILTERS.find((f) => f.id === filter)?.icon?.replace("-outline", "") || "mc:paw"}
              title={filter === "milestone" ? "Chưa có cột mốc nào" : filter === "care" ? "Chưa có lần chăm sóc nào" : filter === "moment" ? "Chưa có khoảnh khắc nào" : "Hành trình còn trống"}
              message={filter === "milestone" ? "Thêm ngày về nhà trong hồ sơ để PawPrint tự tạo các mốc 100, 365, 1000 ngày." : "Mỗi khoảnh khắc và lần chăm sóc sẽ xuất hiện tại đây theo thời gian."}
              actionLabel={filter === "care" ? "Ghi chăm sóc" : filter === "milestone" ? "Cập nhật hồ sơ" : "Lưu khoảnh khắc"}
              onAction={() => router.push(filter === "care" ? `/care?petId=${petId}` : filter === "milestone" ? `/pets/${petId}/settings` : `/moments?petId=${petId}&compose=1`)}
              secondaryLabel={filter !== "all" ? "Xem tất cả" : undefined}
              onSecondary={() => setFilter("all")}
            />
          ) : (
            <View>
              <View style={styles.axis} />
              {events.map((e, i) => {
                if (e.header)
                  return (
                    <FadeIn key={e.id + filter} index={i} trigger={filter}>
                      <View style={styles.month}>
                        <View style={styles.monthDot} />
                        <Text style={styles.monthText}>{e.header}</Text>
                      </View>
                    </FadeIn>
                  );
                const d = describe(e);
                const photo = e.type === "moment" ? photos[String(e.id).toLowerCase()] : null;
                const big = e.type === "milestone";
                return (
                  <FadeIn key={e.id + filter} index={i} trigger={filter} style={styles.row}>
                    <View style={[styles.node, { backgroundColor: big ? colors.accent : d.soft }, big && styles.nodeBig]}>
                      <Icon name={d.icon} size={big ? 20 : 17} color={big ? colors.primaryDark : d.color} />
                    </View>
                    <View style={[styles.card, big && styles.cardBig]} accessible accessibilityLabel={`${formatDate(e.occurredAt)}. ${d.title}. ${d.detail || ""}`}>
                      {big && <Sparkle size={14} style={{ position: "absolute", right: 14, top: 12 }} />}
                      <Text style={[styles.date, big && { color: colors.primaryDark }]}>{formatDate(e.occurredAt, { weekday: true })}</Text>
                      <Text style={[styles.title, big && styles.titleBig]}>{d.title}</Text>
                      {!!d.detail && <Text style={[styles.detail, big && { color: colors.primary }]}>{d.detail}</Text>}
                      {!!photo && <SmartImage uri={photo} style={styles.photo} />}
                    </View>
                  </FadeIn>
                );
              })}
              {more && <Button title="Xem thêm hành trình" variant="outline" icon="chevron-down" onPress={() => load(page + 1)} loading={loadingMore} style={{ marginLeft: 52, marginTop: 6 }} />}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  axis: { position: "absolute", left: 19, top: 10, bottom: 10, width: 3, borderRadius: 2, backgroundColor: colors.primaryTint },
  month: { flexDirection: "row", alignItems: "center", gap: 14, marginVertical: 10 },
  monthDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, marginLeft: 13.5, borderWidth: 3, borderColor: colors.background },
  monthText: { fontFamily: fonts.black, fontSize: 15, color: colors.primary },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  node: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.background },
  nodeBig: { width: 42, height: 42 },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  cardBig: { backgroundColor: colors.accentSoft, borderColor: "#F6D59C", ...shadow.soft },
  date: { fontFamily: fonts.heavy, fontSize: 11.5, color: colors.inkSoft },
  title: { fontFamily: fonts.heavy, fontSize: 15.5, lineHeight: 22, color: colors.ink, marginTop: 3 },
  titleBig: { fontFamily: fonts.black, fontSize: 18, color: colors.primaryDark },
  detail: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 20, color: colors.inkSoft, marginTop: 2 },
  photo: { width: "100%", aspectRatio: 1.6, borderRadius: radius.md, marginTop: 10 },
});

