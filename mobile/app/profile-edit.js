import React, { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/services/api";
import { useAuth } from "../src/context/AuthContext";
import { colors, fonts, radius } from "../src/theme";
import ScreenHeader from "../src/components/ScreenHeader";
import FormField from "../src/components/FormField";
import AvatarEditor from "../src/components/AvatarEditor";
import Button from "../src/components/Button";
import LoadingSkeleton from "../src/components/LoadingSkeleton";
import EmptyState from "../src/components/EmptyState";
import { ConfirmSheet } from "../src/components/BottomSheet";
import { useToast } from "../src/components/Toast";
import Icon from "../src/components/Icon";
import { ErrorBanner } from "../src/features/auth/AuthLayout";

const PHONE = /^(\+?84|0)(3|5|7|8|9)\d{8}$/;
const FIELDS = ["displayName", "phone", "bio", "avatarUrl"];

export default function ProfileEdit() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { refreshUser } = useAuth();
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(null);
  const [exists, setExists] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api("/profile");
      const f = { displayName: r.profile.displayName || "", phone: r.profile.phone || "", bio: r.profile.bio || "", avatarUrl: r.profile.avatarUrl || null };
      setOriginal(f);
      setForm(f);
      setExists(r.exists);
      setEmail(r.profile.email);
      setStatus("ready");
    } catch (e) {
      setLoadError(e.message);
      setStatus("error");
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (status !== "ready") load();
    }, [load, status]),
  );

  const changed = useMemo(() => (form && original ? FIELDS.filter((k) => String(form[k] ?? "") !== String(original[k] ?? "")) : []), [form, original]);
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function save() {
    const e = {};
    if (!form.displayName.trim()) e.displayName = "Tên hiển thị không được để trống.";
    if (form.phone.trim() && !PHONE.test(form.phone.replace(/[\s.-]/g, ""))) e.phone = "Số điện thoại chưa đúng, ví dụ 0912 345 678.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setBanner("");
    try {
      const body = { displayName: form.displayName.trim(), phone: form.phone.replace(/[\s.-]/g, "") || null, bio: form.bio.trim() || null, avatarUrl: form.avatarUrl || null };
      await api("/profile", { method: exists ? "PATCH" : "POST", body });
      await refreshUser().catch(() => {});
      toast.success("Đã lưu hồ sơ của bạn");
      router.back();
    } catch (err) {
      setBanner(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeProfile() {
    setDeleting(true);
    try {
      await api("/profile", { method: "DELETE" });
      await refreshUser().catch(() => {});
      setConfirm(false);
      toast.info("Đã xóa thông tin hồ sơ cá nhân");
      router.back();
    } catch (err) {
      setConfirm(false);
      setBanner(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Thông tin cá nhân" subtitle={email} />
      {status !== "ready" ? (
        <View style={{ padding: 18 }}>
          {status === "loading" ? <LoadingSkeleton variant="form" count={3} /> : <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được hồ sơ" message={loadError} actionLabel="Thử lại" onAction={load} />}
        </View>
      ) : (
        <>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              <ErrorBanner message={banner} onRetry={banner ? save : null} />
              <View style={styles.card}>
                <AvatarEditor value={form.avatarUrl} onChange={set("avatarUrl")} onBusy={setUploading} disabled={saving} label="Ảnh đại diện của bạn" />
                <FormField label="Tên hiển thị" required icon="person-outline" autoCapitalize="words" value={form.displayName} onChangeText={set("displayName")} error={errors.displayName} changed={changed.includes("displayName")} maxLength={100} />
                <FormField label="Số điện thoại" icon="call-outline" keyboardType="phone-pad" value={form.phone} onChangeText={set("phone")} error={errors.phone} changed={changed.includes("phone")} hint="Chỉ dùng khi giao hàng, không hiển thị công khai." />
                <FormField label="Giới thiệu ngắn" icon="chatbubble-ellipses-outline" multiline placeholder="Ví dụ: Sen của 2 bé mèo mê ngủ 🐱" value={form.bio} onChangeText={set("bio")} changed={changed.includes("bio")} maxLength={1000} />
              </View>
              {exists && (
                <View style={styles.danger}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Icon name="warning-outline" size={18} color={colors.danger} />
                    <Text style={styles.dangerTitle}>Xóa thông tin cá nhân</Text>
                  </View>
                  <Text style={styles.dangerText}>Xóa tên hiển thị, số điện thoại, giới thiệu và ảnh đại diện. Tài khoản đăng nhập, đơn hàng và các bé vẫn được giữ lại.</Text>
                  <Button title="Xóa thông tin cá nhân" variant="danger" icon="trash-outline" onPress={() => setConfirm(true)} disabled={saving} />
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Text style={styles.footerText}>{changed.length ? `${changed.length} thay đổi chưa lưu` : "Chưa có thay đổi"}</Text>
            <Button title={exists ? "Lưu thay đổi" : "Tạo hồ sơ"} icon="checkmark" onPress={save} loading={saving} disabled={(exists && !changed.length) || uploading} style={{ minWidth: 160 }} />
          </View>
        </>
      )}
      <ConfirmSheet visible={confirm} onClose={() => setConfirm(false)} onConfirm={removeProfile} loading={deleting} destructive title="Xóa thông tin cá nhân?" message="Tên hiển thị, số điện thoại, giới thiệu và ảnh đại diện sẽ bị xóa. Tài khoản, đơn hàng và thú cưng vẫn còn." confirmLabel="Xóa thông tin" cancelLabel="Giữ lại" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 40, width: "100%", maxWidth: 760, alignSelf: "center" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.dangerSoft, borderRadius: radius.lg, padding: 16, marginTop: 16 },
  dangerTitle: { fontFamily: fonts.heavy, fontSize: 15.5, color: colors.danger },
  dangerText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.ink, marginBottom: 12 },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  footerText: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5, color: colors.inkSoft },
});

