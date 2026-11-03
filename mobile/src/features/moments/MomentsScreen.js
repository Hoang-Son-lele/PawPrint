import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePets } from "../../context/PetsContext";
import { colors, fonts, radius, shadow } from "../../theme";
import { formatDate, relativeDate } from "../../utils/format";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import { FilterChipRow } from "../../components/FilterChip";
import EmptyState from "../../components/EmptyState";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import SmartImage from "../../components/SmartImage";
import Button, { IconButton } from "../../components/Button";
import Pressy from "../../components/Pressy";
import FadeIn from "../../components/FadeIn";
import Icon from "../../components/Icon";
import { useToast } from "../../components/Toast";
import useMoments from "./useMoments";
import PhotoComposer from "./PhotoComposer";
import MomentViewer from "./MomentViewer";

export default function MomentsScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const { pets, status: petStatus, load: loadPets } = usePets();
  const [filter, setFilter] = useState(params.petId || "all");
  const [mode, setMode] = useState("list");
  const [composer, setComposer] = useState(params.compose === "1" || params.capture === "1");
  const [viewer, setViewer] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const journal = useMoments(filter, pets);

  useEffect(() => {
    if (params.petId) setFilter(params.petId);
    if (params.compose === "1") setComposer(true);
  }, [params.petId, params.compose]);

  useFocusEffect(
    useCallback(() => {
      journal.load(1);
    }, [filter, pets]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const cols = width >= 900 ? 5 : width >= 600 ? 4 : 3;
  const contentW = Math.min(width, 760) - 36;
  const tile = (contentW - (cols - 1) * 6) / cols;
  const filterOptions = useMemo(() => [{ id: "all", label: "Tất cả bé", icon: "mc:paw" }, ...pets.map((p) => ({ id: p.id, label: p.name }))], [pets]);
  const photosOnly = journal.items;

  const onSaved = async (newId, pet) => {
    setComposer(false);
    toast.success(`Đã lưu khoảnh khắc của ${pet?.name || "bé"}`);
    setFresh(newId);
    if (filter !== "all" && pet && filter !== pet.id) setFilter(pet.id);
    else await journal.load(1);
    setTimeout(() => setFresh(null), 2400);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadPets().catch(() => {});
    await journal.load(1);
    setRefreshing(false);
  };

  const header = (
    <ScreenHeader
      back={false}
      title="Khoảnh khắc"
      subtitle="Cuốn nhật ký ảnh của các bé"
      right={
        <View style={styles.toggle} accessibilityRole="radiogroup">
          {[
            ["list", "reader-outline", "Xem dạng câu chuyện"],
            ["grid", "grid-outline", "Xem dạng lưới ảnh"],
          ].map(([m, icon, label]) => (
            <Pressy key={m} onPress={() => setMode(m)} accessibilityRole="radio" accessibilityState={{ selected: mode === m }} accessibilityLabel={label} style={[styles.toggleBtn, mode === m && styles.toggleActive]}>
              <Icon name={icon} size={19} color={mode === m ? colors.white : colors.inkSoft} />
            </Pressy>
          ))}
        </View>
      }
    />
  );

  const noPets = petStatus === "ready" && !pets.length;

  return (
    <>
      <Screen header={header} refreshing={refreshing} onRefresh={refresh} bottomInset={180}>
        {pets.length > 1 && <FilterChipRow options={filterOptions} value={filter} onChange={setFilter} style={{ marginBottom: 12 }} />}
        {noPets ? (
          <EmptyState icon="paw-outline" emoji="🐾" title="Thêm bé trước đã nhé" message="Khoảnh khắc được lưu theo từng bé. Tạo hồ sơ đầu tiên để bắt đầu cuốn nhật ký ảnh." actionLabel="Thêm bé" actionIcon="add" onAction={() => router.push("/pets/new")} />
        ) : journal.status === "loading" || petStatus === "loading" ? (
          <LoadingSkeleton variant="photos" count={2} />
        ) : journal.status === "error" ? (
          <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được khoảnh khắc" message={journal.error} actionLabel="Thử lại" onAction={() => journal.load(1)} />
        ) : !photosOnly.length ? (
          <EmptyState
            icon="camera-outline"
            title="Khoảnh khắc đầu tiên đang chờ bạn"
            message="Bé ngủ say, lần đầu tắm, hay chỉ là một ánh nhìn đáng yêu — hãy lưu lại để sau này nhìn lại thật vui."
            actionLabel="Lưu khoảnh khắc đầu tiên"
            actionIcon="camera"
            onAction={() => setComposer(true)}
          />
        ) : mode === "grid" ? (
          <View style={styles.grid}>
            {photosOnly.map((m, i) => (
              <FadeIn key={m.id} index={i % 12} from="scale" trigger={m.id === fresh ? fresh : undefined}>
                <Pressy onPress={() => setViewer(i)} scaleTo={0.94} accessibilityLabel={`Ảnh ${m.pet?.name || ""} ${formatDate(m.occurredAt)}. Mở toàn màn hình`} style={[{ width: tile, height: tile }, styles.tile, m.id === fresh && styles.fresh]}>
                  <SmartImage uri={m.photos?.[0]?.url} style={{ width: "100%", height: "100%" }} fallback="paw" />
                </Pressy>
              </FadeIn>
            ))}
          </View>
        ) : (
          photosOnly.map((m, i) => (
            <FadeIn key={m.id} index={i % 8} trigger={m.id === fresh ? fresh : undefined} from={m.id === fresh ? "scale" : "bottom"}>
              <Pressy onPress={() => setViewer(i)} scaleTo={0.985} style={[styles.story, m.id === fresh && styles.fresh]} accessibilityLabel={`${m.pet?.name}, ${formatDate(m.occurredAt)}: ${m.caption || "Khoảnh khắc"}. Mở toàn màn hình`}>
                {m.photos?.[0]?.url ? <SmartImage uri={m.photos[0].url} style={styles.storyImg} fallback="paw" /> : null}
                <View style={styles.storyBody}>
                  <View style={styles.storyMeta}>
                    <View style={styles.petPill}>
                      <Icon name="mc:paw" size={12} color={colors.primaryDark} />
                      <Text style={styles.petPillText}>{m.pet?.name}</Text>
                    </View>
                    <Text style={styles.storyDate}>{relativeDate(m.occurredAt)}</Text>
                    {m.id === fresh && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newText}>Mới</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.storyCaption}>{m.caption || "Một ngày đáng nhớ bên bé."}</Text>
                </View>
              </Pressy>
            </FadeIn>
          ))
        )}
        {journal.more && journal.status === "ready" && (
          <Button title="Xem thêm khoảnh khắc" variant="outline" icon="chevron-down" onPress={journal.next} loading={journal.loadingMore} style={{ marginTop: 10 }} full />
        )}
      </Screen>

      {!noPets && pets.length > 0 && (
        <View style={[styles.fabWrap, { bottom: insets.bottom + 94 }]} pointerEvents="box-none">
          <Button title="Lưu khoảnh khắc" icon="camera" variant="accent" size="lg" onPress={() => setComposer(true)} feedback="medium" style={styles.fab} />
        </View>
      )}

      {pets.length > 0 && (
        <PhotoComposer visible={composer} onClose={() => setComposer(false)} pets={pets} defaultPetId={filter} onSaved={onSaved} autoCamera={params.capture === "1"} />
      )}
      <MomentViewer
        items={photosOnly}
        index={viewer}
        onClose={() => setViewer(null)}
        onChanged={(updated, removedId) =>
          journal.setItems((list) => (removedId ? list.filter((m) => m.id !== removedId) : list.map((m) => (m.id === updated.id ? updated : m))))
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: colors.border },
  toggleBtn: { width: 44, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  toggleActive: { backgroundColor: colors.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tile: { borderRadius: 14, overflow: "hidden" },
  fresh: { borderWidth: 3, borderColor: colors.accent },
  story: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  storyImg: { width: "100%", aspectRatio: 1.05 },
  storyBody: { padding: 16 },
  storyMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  petPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  petPillText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.primaryDark },
  storyDate: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.inkSoft },
  newBadge: { backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  newText: { fontFamily: fonts.black, fontSize: 11, color: colors.primaryDark },
  storyCaption: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, color: colors.ink, marginTop: 8 },
  fabWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  fab: { borderRadius: 999, paddingHorizontal: 26, ...shadow.lifted },
});
