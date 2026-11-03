import React, { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../../src/services/api";
import { usePets } from "../../../src/context/PetsContext";
import { colors, fonts, radius } from "../../../src/theme";
import { today } from "../../../src/utils/format";
import ScreenHeader from "../../../src/components/ScreenHeader";
import FormField from "../../../src/components/FormField";
import DatePickerField from "../../../src/components/DatePickerField";
import AvatarEditor from "../../../src/components/AvatarEditor";
import Button from "../../../src/components/Button";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import EmptyState from "../../../src/components/EmptyState";
import { ConfirmSheet } from "../../../src/components/BottomSheet";
import { useToast } from "../../../src/components/Toast";
import Icon from "../../../src/components/Icon";
import { ErrorBanner } from "../../../src/features/auth/AuthLayout";
import { SexPicker, SpeciesPicker } from "../../../src/features/pets/PetFormParts";
import { petToForm, toPayload, validatePet } from "../../../src/features/pets/petForm";

const KEY_MAP = { weight: "weightKg" };

function Group({ title, icon, children }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Icon name={icon} size={18} color={colors.primary} />
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function PetSettings() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { getPet, upsert, remove } = usePets();
  const [original, setOriginal] = useState(() => (getPet(id) ? petToForm(getPet(id)) : null));
  const [form, setForm] = useState(original);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(original ? "ready" : "loading");
  const [loadError, setLoadError] = useState("");
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { pet } = await api(`/pets/${id}`);
      const f = petToForm(pet);
      setOriginal(f);
      setForm((cur) => (cur && original && JSON.stringify(cur) !== JSON.stringify(original) ? cur : f));
      setStatus("ready");
    } catch (e) {
      setLoadError(e.message);
      setStatus((s) => (s === "ready" ? s : "error"));
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const changed = useMemo(() => {
    if (!form || !original) return [];
    return Object.keys(form).filter((k) => String(form[k] ?? "") !== String(original[k] ?? ""));
  }, [form, original]);
  const isChanged = (k) => changed.includes(k);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  async function save() {
    if (!changed.length || saving) return;
    const e = validatePet(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setBanner("");
    try {
      const full = toPayload(form);
      const body = {};
      for (const k of changed) {
        const key = KEY_MAP[k] || k;
        body[key] = full[key];
      }
      const r = await api(`/pets/${id}`, { method: "PATCH", body });
      upsert(r.pet); // Trang chủ & các tab cập nhật ngay lập tức
      toast.success(`Đã lưu thay đổi cho ${r.pet.name}`);
      router.back();
    } catch (err) {
      if (err.status === 400 && /về|đón|adopted/i.test(err.message)) setErrors({ adoptedAt: err.message });
      else setBanner(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    setDeleting(true);
    try {
      await api(`/pets/${id}`, { method: "DELETE" });
      remove(id);
      setConfirm(false);
      toast.info(`Đã xóa hồ sơ của ${original?.name}`);
      router.replace("/");
    } catch (err) {
      setConfirm(false);
      setBanner(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (status !== "ready")
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Chỉnh sửa hồ sơ" />
        <View style={{ padding: 18 }}>
          {status === "loading" ? (
            <LoadingSkeleton variant="form" count={4} />
          ) : (
            <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được hồ sơ" message={loadError} actionLabel="Thử lại" onAction={load} />
          )}
        </View>
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Chỉnh sửa hồ sơ" subtitle={original?.name} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <ErrorBanner message={banner} onRetry={banner ? save : null} />
          <Group title="Ảnh & tên" icon="happy-outline">
            <AvatarEditor value={form.avatarUrl} onChange={set("avatarUrl")} onBusy={setUploading} disabled={saving} label="Ảnh đại diện của bé" fallback={form.species === "cat" ? "cat" : "dog"} />
            {isChanged("avatarUrl") && <Text style={styles.changedNote}>Ảnh đại diện đã thay đổi</Text>}
            <FormField label="Tên bé" required value={form.name} onChangeText={set("name")} error={errors.name} changed={isChanged("name")} autoCapitalize="words" maxLength={100} />
            <Text style={styles.label}>
              Loài {isChanged("species") && <Text style={styles.changedInline}>· Đã sửa</Text>}
            </Text>
            <SpeciesPicker value={form.species} onChange={set("species")} size="sm" />
          </Group>
          <Group title="Thông tin" icon="information-circle-outline">
            <FormField label="Giống" value={form.breed} onChangeText={set("breed")} error={errors.breed} changed={isChanged("breed")} autoCapitalize="words" maxLength={120} />
            <SexPicker value={form.sex} onChange={set("sex")} />
            <DatePickerField label="Ngày sinh" value={form.birthDate} onChange={set("birthDate")} maxDate={today()} error={errors.birthDate} changed={isChanged("birthDate")} />
            <DatePickerField label="Ngày về nhà" value={form.adoptedAt} onChange={set("adoptedAt")} maxDate={today()} minDate={form.birthDate || undefined} error={errors.adoptedAt} changed={isChanged("adoptedAt")} />
          </Group>
          <Group title="Sức khỏe & ghi chú" icon="fitness-outline">
            <FormField label="Cân nặng" keyboardType="decimal-pad" suffix="kg" value={form.weight} onChangeText={set("weight")} error={errors.weight} changed={isChanged("weight")} hint="Để theo dõi theo thời gian, hãy ghi ở mục Chăm sóc." />
            <FormField label="Ghi chú" multiline value={form.notes} onChangeText={set("notes")} error={errors.notes} changed={isChanged("notes")} maxLength={1000} />
          </Group>

          <View style={styles.danger}>
            <View style={styles.groupHead}>
              <Icon name="warning-outline" size={18} color={colors.danger} />
              <Text style={[styles.groupTitle, { color: colors.danger }]}>Vùng nguy hiểm</Text>
            </View>
            <Text style={styles.dangerText}>
              Xóa hồ sơ sẽ ẩn {original?.name} khỏi PawPrint, cùng với khoảnh khắc, nhật ký chăm sóc và hành trình của bé. Bạn sẽ không thể xem lại trong ứng dụng.
            </Text>
            <Button title={`Xóa hồ sơ của ${original?.name}`} variant="danger" icon="trash-outline" onPress={() => setConfirm(true)} disabled={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Text style={styles.footerText} accessibilityLiveRegion="polite">
          {changed.length ? `${changed.length} thay đổi chưa lưu` : "Chưa có thay đổi"}
        </Text>
        <Button title="Lưu thay đổi" icon="checkmark" onPress={save} loading={saving} loadingText="Đang lưu…" disabled={!changed.length || uploading} feedback="medium" style={{ minWidth: 170 }} />
      </View>
      <ConfirmSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={destroy}
        loading={deleting}
        destructive
        title={`Xóa hồ sơ của ${original?.name}?`}
        message="Hồ sơ cùng khoảnh khắc, nhật ký chăm sóc và hành trình của bé sẽ không còn hiển thị. Hành động này không thể hoàn tác trong ứng dụng."
        confirmLabel="Xóa hồ sơ"
        cancelLabel="Giữ lại hồ sơ"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 40, width: "100%", maxWidth: 760, alignSelf: "center" },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  groupTitle: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginBottom: 8 },
  changedInline: { fontFamily: fonts.heavy, color: colors.warning, fontSize: 12 },
  changedNote: { fontFamily: fonts.heavy, fontSize: 12, color: colors.warning, textAlign: "center", marginBottom: 8 },
  danger: { backgroundColor: colors.dangerSoft, borderRadius: radius.lg, padding: 16, marginTop: 10, borderWidth: 1, borderColor: "#F6CFCF" },
  dangerText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.ink, marginBottom: 12 },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  footerText: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5, color: colors.inkSoft },
});
