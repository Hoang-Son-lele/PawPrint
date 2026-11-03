import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { api } from "../../src/services/api";
import {
  Caption,
  ErrorText,
  Page,
  PrimaryButton,
  TextField,
  Title,
} from "../../src/components/UI";
import { palette } from "../../src/theme";
import AvatarEditor from "../../src/components/AvatarEditor";

export default function NewPet() {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [breed, setBreed] = useState("");
  const [adoptedAt, setAdoptedAt] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarUrl,setAvatarUrl]=useState(null),[uploading,setUploading]=useState(false);
  const save = async () => {
    setError("");
    setLoading(true);
    try {
      await api("/pets", {
        method: "POST",
        body: {
          name,
          species,
          breed: breed || null,
          adoptedAt: adoptedAt || null,
          birthDate: birthDate || null,
          avatarUrl,
        },
      });
      router.back();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Page>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingTop: 22, paddingBottom: 38 }}
          keyboardShouldPersistTaps="handled"
        >
          <Title>Thêm người bạn mới</Title>
          <Caption>Ngày sinh và ngày đón về có thể để trống.</Caption>
          <View style={{ marginTop: 18 }}>
            <AvatarEditor value={avatarUrl} onChange={setAvatarUrl} onBusy={setUploading} disabled={loading} label="Ảnh đại diện thú cưng" />
            <TextField
              label="Tên thú cưng *"
              placeholder="Ví dụ: Miu"
              value={name}
              autoCapitalize="words"
              onChangeText={setName}
            />
            <Text style={styles.label}>Loài *</Text>
            <View style={styles.speciesRow}>
              {[
                ["dog", "🐶 Chó"],
                ["cat", "🐱 Mèo"],
                ["other", "🐾 Khác"],
              ].map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setSpecies(value)}
                  style={[styles.species, species === value && styles.selected]}
                >
                  <Text
                    style={{
                      color: species === value ? "#FFF" : palette.primaryDark,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label="Giống (tùy chọn)"
              placeholder="Ví dụ: Corgi"
              value={breed}
              onChangeText={setBreed}
              autoCapitalize="words"
            />
            <TextField
              label="Ngày đón về (YYYY-MM-DD)"
              placeholder="2026-10-21"
              value={adoptedAt}
              onChangeText={setAdoptedAt}
            />
            <TextField
              label="Ngày sinh (YYYY-MM-DD)"
              placeholder="2025-06-01"
              value={birthDate}
              onChangeText={setBirthDate}
            />
            <ErrorText error={error} />
            <PrimaryButton title="Lưu hồ sơ" loading={loading} disabled={uploading} onPress={save} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}
const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.ink,
    marginTop: 12,
    marginBottom: 8,
  },
  speciesRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  species: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    backgroundColor: "#FFF",
  },
  selected: { backgroundColor: palette.primary, borderColor: palette.primary },
});
