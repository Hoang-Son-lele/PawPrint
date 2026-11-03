import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { colors, fonts, radius } from "../../theme";
import { selectPhoto, uploadMoment } from "../../services/media";
import { today } from "../../utils/format";
import BottomSheet from "../../components/BottomSheet";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import DatePickerField from "../../components/DatePickerField";
import { FilterChipRow } from "../../components/FilterChip";
import SmartImage from "../../components/SmartImage";
import Pressy from "../../components/Pressy";
import Icon from "../../components/Icon";
import { ErrorBanner } from "../auth/AuthLayout";

/**
 * Soạn khoảnh khắc: chọn bé, chọn/chụp ảnh, chú thích, ngày.
 * Tiến trình tải lên thật; lỗi giữ nguyên ảnh + requestKey để thử lại không bị trùng.
 */
export default function PhotoComposer({ visible, onClose, pets, defaultPetId, onSaved, autoCamera }) {
  const [petId, setPetId] = useState(defaultPetId || pets[0]?.id || "");
  const [asset, setAsset] = useState(null);
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(today());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const pending = useRef(null);
  const bar = useRef(new Animated.Value(0)).current;
  const started = useRef(false);

  useEffect(() => {
    if (visible) {
      setPetId(defaultPetId && defaultPetId !== "all" ? defaultPetId : pets[0]?.id || "");
      if (autoCamera && Platform.OS !== "web" && !started.current) {
        started.current = true;
        pick(true);
      }
    } else started.current = false;
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Animated.timing(bar, { toValue: progress, duration: 180, useNativeDriver: false }).start();
  }, [progress, bar]);

  function resetAll() {
    setAsset(null);
    setCaption("");
    setDate(today());
    setError("");
    setProgress(0);
    pending.current = null;
  }

  async function pick(camera) {
    setError("");
    try {
      const selected = await selectPhoto(camera);
      if (selected) {
        setAsset(selected);
        pending.current = null;
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function save() {
    if (!asset || busy || !petId) return;
    setBusy(true);
    setError("");
    setProgress(0.03);
    if (!pending.current)
      pending.current = { petId, asset, caption: caption.trim(), date, requestKey: Crypto.randomUUID() };
    try {
      const r = await uploadMoment(pending.current, setProgress);
      const pet = pets.find((p) => p.id === pending.current.petId);
      resetAll();
      onSaved?.(r.id, pet);
    } catch (e) {
      setProgress(0);
      setError(`${e.message} Ảnh vẫn được giữ lại để bạn thử lại.`);
    } finally {
      setBusy(false);
    }
  }

  const close = () => {
    if (busy) return;
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      dismissible={!busy}
      title="Lưu khoảnh khắc"
      subtitle="Một tấm ảnh, một câu chuyện nhỏ"
      footer={
        <View style={{ gap: 8 }}>
          {busy && (
            <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>{progress >= 0.98 ? "Đang hoàn tất…" : "Đang tải ảnh lên…"}</Text>
                <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={styles.track}>
                <Animated.View style={[styles.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
              </View>
            </View>
          )}
          <Button
            title={pending.current && !busy ? "Thử lưu lại" : "Lưu khoảnh khắc"}
            icon={pending.current && !busy ? "refresh" : "heart"}
            variant="accent"
            onPress={save}
            loading={busy}
            loadingText="Đang lưu…"
            disabled={!asset || !petId}
            feedback="medium"
            full
          />
        </View>
      }
    >
      <ErrorBanner message={error} />
      {pets.length > 1 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Khoảnh khắc của bé</Text>
          <FilterChipRow options={pets.map((p) => ({ id: p.id, label: p.name }))} value={petId} onChange={(v) => { setPetId(v); pending.current = null; }} disabled={busy} />
        </View>
      )}
      {asset ? (
        <View>
          <SmartImage uri={asset.uri} style={styles.preview} />
          {!busy && (
            <View style={styles.previewActions}>
              <Pressy onPress={() => pick(false)} style={styles.chipBtn} accessibilityLabel="Đổi ảnh khác">
                <Icon name="swap-horizontal" size={16} color={colors.white} />
                <Text style={styles.chipBtnText}>Đổi ảnh</Text>
              </Pressy>
              <Pressy onPress={() => { setAsset(null); pending.current = null; }} style={styles.chipBtn} accessibilityLabel="Bỏ ảnh">
                <Icon name="close" size={16} color={colors.white} />
                <Text style={styles.chipBtnText}>Bỏ ảnh</Text>
              </Pressy>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.pickRow}>
          {Platform.OS !== "web" && (
            <Pressy onPress={() => pick(true)} style={[styles.pick, { backgroundColor: colors.primary }]} feedback="light" accessibilityLabel="Chụp ảnh mới">
              <Icon name="camera" size={30} color={colors.accent} />
              <Text style={[styles.pickText, { color: colors.white }]}>Chụp ảnh</Text>
            </Pressy>
          )}
          <Pressy onPress={() => pick(false)} style={styles.pick} feedback="light" accessibilityLabel="Chọn ảnh từ thư viện">
            <Icon name="images" size={30} color={colors.primary} />
            <Text style={styles.pickText}>{Platform.OS === "web" ? "Chọn ảnh từ máy" : "Thư viện ảnh"}</Text>
          </Pressy>
        </View>
      )}
      <View style={{ marginTop: 14 }}>
        <FormField label="Lời kể" placeholder="Hôm nay bé có gì đáng yêu?" multiline value={caption} onChangeText={(v) => { setCaption(v); pending.current = null; }} maxLength={1000} editable={!busy} />
        <DatePickerField label="Ngày diễn ra" value={date} onChange={(v) => { setDate(v || today()); pending.current = null; }} maxDate={today()} clearable={false} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginBottom: 6 },
  pickRow: { flexDirection: "row", gap: 12 },
  pick: { flex: 1, minHeight: 130, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderStyle: "dashed", borderColor: colors.primaryTint },
  pickText: { fontFamily: fonts.heavy, fontSize: 15, color: colors.primary },
  preview: { width: "100%", aspectRatio: 1.2, borderRadius: radius.lg },
  previewActions: { position: "absolute", right: 10, bottom: 10, flexDirection: "row", gap: 8 },
  chipBtn: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 40, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(7,26,58,0.7)" },
  chipBtnText: { fontFamily: fonts.heavy, fontSize: 13, color: colors.white },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressText: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkSoft },
  progressPct: { fontFamily: fonts.black, fontSize: 13, color: colors.primary },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.primarySoft, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, backgroundColor: colors.accent },
});
