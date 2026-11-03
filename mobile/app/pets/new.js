import React, { useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/services/api";
import { usePets } from "../../src/context/PetsContext";
import { colors, fonts, radius, shadow } from "../../src/theme";
import { species as speciesOf, today } from "../../src/utils/format";
import { haptic } from "../../src/utils/haptics";
import ScreenHeader from "../../src/components/ScreenHeader";
import FormField from "../../src/components/FormField";
import DatePickerField from "../../src/components/DatePickerField";
import AvatarEditor from "../../src/components/AvatarEditor";
import Button from "../../src/components/Button";
import FadeIn from "../../src/components/FadeIn";
import SmartImage from "../../src/components/SmartImage";
import { PawBurst } from "../../src/components/Decor";
import { ErrorBanner } from "../../src/features/auth/AuthLayout";
import { SexPicker, SpeciesPicker } from "../../src/features/pets/PetFormParts";
import { emptyPetForm, toPayload, validatePet } from "../../src/features/pets/petForm";

const STEPS = [
  { title: "Bé là…", sub: "Chọn loài của bé" },
  { title: "Làm quen", sub: "Ảnh, tên và vài điều cơ bản" },
  { title: "Kỷ niệm", sub: "Ngày sinh, ngày về nhà, sức khỏe" },
];
const STEP_FIELDS = [[], ["name", "breed"], ["birthDate", "adoptedAt", "weight", "notes"]];

export default function NewPet() {
  const insets = useSafeAreaInsets();
  const { upsert } = usePets();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyPetForm);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [created, setCreated] = useState(null);
  const lock = useRef(false);
  const scroll = useRef(null);
  const progress = useRef(new Animated.Value(1 / 3)).current;

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };
  const go = (n) => {
    setStep(n);
    Animated.timing(progress, { toValue: (n + 1) / 3, duration: 260, useNativeDriver: false }).start();
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  function next() {
    if (step === 0 && !form.species) return setErrors({ species: "Chọn Chó, Mèo hoặc Khác để tiếp tục." });
    const e = validatePet(form, STEP_FIELDS[step]);
    setErrors(e);
    if (Object.keys(e).length) return haptic.warning();
    if (step < 2) go(step + 1);
    else save();
  }

  async function save() {
    if (lock.current) return;
    const e = validatePet(form);
    setErrors(e);
    if (Object.keys(e).length) {
      if (e.name) go(1);
      return;
    }
    lock.current = true;
    setSaving(true);
    setBanner("");
    try {
      const r = await api("/pets", { method: "POST", body: toPayload(form) });
      upsert(r.pet);
      haptic.success();
      setCreated(r.pet);
    } catch (err) {
      if (err.status === 400 && /adopted|về|đón/i.test(err.message)) setErrors({ adoptedAt: err.message });
      else setBanner(err.message);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  if (created) return <Success pet={created} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Thêm bé mới"
        subtitle={`Bước ${step + 1}/3 · ${STEPS[step].sub}`}
        onBack={step > 0 ? () => go(step - 1) : undefined}
      />
      <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: step + 1 }}>
        <Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>
      <View style={styles.stepRow}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              <Text style={[styles.stepNum, i <= step && { color: colors.primaryDark }]}>{i < step ? "✓" : i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i === step && { color: colors.primary }]}>{s.title}</Text>
          </View>
        ))}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <FadeIn key={step} from="right" distance={20}>
            <ErrorBanner message={banner} onRetry={banner ? save : null} />
            {step === 0 && (
              <>
                <Text style={styles.q}>Người bạn mới của bạn là…</Text>
                <SpeciesPicker value={form.species} onChange={(v) => { set("species")(v); setErrors({}); }} />
                {!!errors.species && <Text style={styles.err}>{errors.species}</Text>}
              </>
            )}
            {step === 1 && (
              <>
                <AvatarEditor value={form.avatarUrl} onChange={set("avatarUrl")} onBusy={setUploading} disabled={saving} label="Thêm ảnh đại diện cho bé" fallback={form.species === "cat" ? "cat" : form.species === "dog" ? "dog" : "paw"} />
                <FormField label="Tên bé" required icon="heart-outline" placeholder={form.species === "cat" ? "Ví dụ: Mochi" : "Ví dụ: Bông"} autoCapitalize="words" value={form.name} onChangeText={set("name")} error={errors.name} maxLength={100} />
                <FormField label="Giống" icon="mc:dna" placeholder={form.species === "cat" ? "Ví dụ: Anh lông ngắn" : "Ví dụ: Corgi"} autoCapitalize="words" value={form.breed} onChangeText={set("breed")} error={errors.breed} hint="Không bắt buộc" maxLength={120} />
                <SexPicker value={form.sex} onChange={set("sex")} />
              </>
            )}
            {step === 2 && (
              <>
                <DatePickerField label="Ngày sinh" value={form.birthDate} onChange={set("birthDate")} maxDate={today()} error={errors.birthDate} hint="Không nhớ chính xác? Chọn ngày gần đúng nhé." />
                <DatePickerField label="Ngày về nhà" value={form.adoptedAt} onChange={set("adoptedAt")} maxDate={today()} minDate={form.birthDate || undefined} error={errors.adoptedAt} hint="Dùng để đếm số ngày bé đồng hành cùng bạn." />
                <FormField label="Cân nặng" icon="mc:scale-bathroom" placeholder="Ví dụ: 4.5" keyboardType="decimal-pad" suffix="kg" value={form.weight} onChangeText={set("weight")} error={errors.weight} />
                <FormField label="Ghi chú" icon="create-outline" placeholder="Sở thích, tính cách, điều đặc biệt…" multiline value={form.notes} onChangeText={set("notes")} error={errors.notes} maxLength={1000} />
              </>
            )}
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {step > 0 && <Button title="Quay lại" variant="outline" icon="chevron-back" onPress={() => go(step - 1)} disabled={saving} style={{ flex: 1 }} />}
        <Button
          title={step < 2 ? "Tiếp tục" : "Lưu hồ sơ bé"}
          iconRight={step < 2 ? "chevron-forward" : undefined}
          icon={step === 2 ? "paw" : undefined}
          variant={step === 2 ? "accent" : "primary"}
          onPress={next}
          loading={saving}
          loadingText="Đang lưu…"
          disabled={uploading}
          feedback="medium"
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}

function Success({ pet }) {
  const insets = useSafeAreaInsets();
  const sp = speciesOf(pet.species);
  return (
    <View style={[styles.success, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 24 }]}>
      <PawBurst play={pet.id} radius={150} size={18} />
      <FadeIn from="scale">
        <Text style={styles.successOver}>Chào mừng thành viên mới</Text>
        <Text style={styles.successTitle} accessibilityRole="header">
          Xin chào, {pet.name}! 🎉
        </Text>
      </FadeIn>
      <FadeIn from="scale" delay={150} style={styles.introCard}>
        <SmartImage uri={pet.avatarUrl} style={styles.introImg} fallback={pet.species === "cat" ? "cat" : pet.species === "dog" ? "dog" : "paw"} />
        <View style={{ padding: 18, alignItems: "center" }}>
          <Text style={styles.introName}>{pet.name}</Text>
          <Text style={styles.introMeta}>
            {sp.emoji} {sp.label}
            {pet.breed ? ` · ${pet.breed}` : ""}
          </Text>
          <Text style={styles.introText}>Cuốn nhật ký của bé đã sẵn sàng. Lưu khoảnh khắc đầu tiên ngay nhé!</Text>
        </View>
      </FadeIn>
      <View style={{ gap: 10, width: "100%", maxWidth: 420 }}>
        <Button title="Lưu khoảnh khắc đầu tiên" icon="camera" variant="accent" onPress={() => router.replace(`/moments?petId=${pet.id}&compose=1`)} full />
        <Button title="Xem hồ sơ của bé" variant="light" onPress={() => router.replace(`/pets/${pet.id}`)} full />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 6, marginHorizontal: 18, borderRadius: 3, backgroundColor: colors.primarySoft, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 3 },
  stepRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 4, maxWidth: 760, width: "100%", alignSelf: "center" },
  stepItem: { alignItems: "center", gap: 4, flex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  stepDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepNum: { fontFamily: fonts.black, fontSize: 13, color: colors.muted },
  stepLabel: { fontFamily: fonts.heavy, fontSize: 12, color: colors.inkSoft },
  content: { padding: 18, paddingBottom: 30, width: "100%", maxWidth: 760, alignSelf: "center" },
  q: { fontFamily: fonts.black, fontSize: 22, color: colors.ink, marginBottom: 16 },
  err: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.danger, marginTop: 12 },
  footer: { flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  success: { flex: 1, backgroundColor: colors.primary, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22 },
  successOver: { fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: colors.accent, textAlign: "center" },
  successTitle: { fontFamily: fonts.black, fontSize: 30, lineHeight: 38, color: colors.white, textAlign: "center", marginTop: 6 },
  introCard: { width: "100%", maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden", ...shadow.lifted },
  introImg: { width: "100%", aspectRatio: 1.25 },
  introName: { fontFamily: fonts.black, fontSize: 24, color: colors.ink },
  introMeta: { fontFamily: fonts.bold, fontSize: 14, color: colors.inkSoft, marginTop: 2 },
  introText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.inkSoft, textAlign: "center", marginTop: 10 },
});
