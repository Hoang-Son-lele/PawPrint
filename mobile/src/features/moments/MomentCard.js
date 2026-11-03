import React, { useState } from "react";
import { Image, Text, Alert, Platform } from "react-native";
import { api } from "../../services/api";
import {
  Card,
  Caption,
  TextField,
  PrimaryButton,
  ErrorText,
} from "../../components/UI";
export default function MomentCard({ item, onChanged }) {
  const [editing, setEditing] = useState(false),
    [caption, setCaption] = useState(item.caption || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function update(remove = false) {
    setBusy(true);
    setError("");
    try {
      await api(`/moments/${item.id}`, {
        method: remove ? "DELETE" : "PATCH",
        ...(!remove
          ? {
              body: {
                caption,
                occurredAt: String(item.occurredAt).slice(0, 10),
              },
            }
          : {}),
      });
      setEditing(false);
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function confirm() {
    if (Platform.OS === "web") {
      if (window.confirm("Xóa khoảnh khắc này?")) update(true);
    } else
      Alert.alert("Xóa khoảnh khắc?", "Khoảnh khắc sẽ được ẩn khỏi nhật ký.", [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: () => update(true) },
      ]);
  }
  return (
    <Card>
      <Caption>{String(item.occurredAt).slice(0, 10)}</Caption>
      {item.photos?.map((photo, i) => (
        <Image
          key={i}
          source={{ uri: photo.url }}
          style={{
            width: "100%",
            height: 280,
            borderRadius: 16,
            marginVertical: 12,
          }}
          resizeMode="cover"
        />
      ))}
      {editing ? (
        <>
          <TextField
            label="Chú thích"
            value={caption}
            onChangeText={setCaption}
            multiline
          />
          <PrimaryButton
            title="Lưu thay đổi"
            loading={busy}
            onPress={() => update()}
          />
          <PrimaryButton
            title="Hủy sửa"
            disabled={busy}
            variant="secondary"
            onPress={() => setEditing(false)}
          />
        </>
      ) : (
        <>
          <Text style={{ fontSize: 16, lineHeight: 25, marginTop: 8 }}>
            {item.caption || "Một ngày đáng nhớ bên bé."}
          </Text>
          <PrimaryButton
            title="Sửa chú thích"
            disabled={busy}
            variant="secondary"
            onPress={() => setEditing(true)}
          />
          <PrimaryButton
            title="Xóa khoảnh khắc"
            disabled={busy}
            variant="secondary"
            onPress={confirm}
          />
        </>
      )}
      <ErrorText error={error} />
    </Card>
  );
}
