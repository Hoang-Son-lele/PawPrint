import React, { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../../src/services/api";
import AvatarEditor from "../../../src/components/AvatarEditor";
import {
  Caption,
  ErrorText,
  Page,
  PrimaryButton,
  TextField,
  Title,
} from "../../../src/components/UI";

export default function PetSettings() {
  const { id } = useLocalSearchParams();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [adoptedAt, setAdoptedAt] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl,setAvatarUrl]=useState(null),[uploading,setUploading]=useState(false);

  const loadPet = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { pet } = await api(`/pets/${id}`);
      setName(pet.name || "");
      setSpecies(pet.species || "other");
      setBreed(pet.breed || "");
      setBirthDate(pet.birthDate || "");
      setAdoptedAt(pet.adoptedAt || "");
      setWeightKg(pet.weightKg == null ? "" : String(pet.weightKg));
      setNotes(pet.notes || "");
      setAvatarUrl(pet.avatarUrl || null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadPet();
    }, [loadPet]),
  );

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api(`/pets/${id}`, {
        method: "PATCH",
        body: {
          name: name.trim(),
          species,
          breed: breed.trim() || null,
          birthDate: birthDate || null,
          adoptedAt: adoptedAt || null,
          weightKg: weightKg ? Number(weightKg) : null,
          notes: notes.trim() || null,
          avatarUrl,
        },
      });
      router.back();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingTop: 22, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Title>Cài đặt thú cưng</Title>
          <Caption>Cập nhật thông tin và những điều đặc biệt về bé.</Caption>
          <View style={{ marginTop: 18 }}>
            <AvatarEditor value={avatarUrl} onChange={setAvatarUrl} onBusy={setUploading} disabled={loading || saving} label="Ảnh đại diện thú cưng" />
            <TextField
              label="Tên thú cưng"
              value={name}
              onChangeText={setName}
            />
            <TextField
              label="Loài (dog, cat, other)"
              value={species}
              onChangeText={setSpecies}
            />
            <TextField label="Giống" value={breed} onChangeText={setBreed} />
            <TextField
              label="Ngày sinh (YYYY-MM-DD)"
              value={birthDate}
              onChangeText={setBirthDate}
            />
            <TextField
              label="Ngày đón về (YYYY-MM-DD)"
              value={adoptedAt}
              onChangeText={setAdoptedAt}
            />
            <TextField
              label="Cân nặng (kg)"
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
            />
            <TextField
              label="Ghi chú"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <ErrorText error={error} />
            <PrimaryButton
              title={loading ? "Đang tải…" : "Lưu thay đổi"}
              loading={saving || loading}
              disabled={loading || uploading}
              onPress={save}
            />
            <PrimaryButton
              title="Hủy"
              variant="secondary"
              onPress={() => router.back()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}
