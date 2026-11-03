import React, { useEffect, useRef, useState } from "react";
import { Platform, Image, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { selectPhoto, uploadMoment } from "../../services/media";
import { today } from "../../utils/format";
import {
  Card,
  Caption,
  TextField,
  PrimaryButton,
  ErrorText,
} from "../../components/UI";
export default function PhotoComposer({
  petId,
  onSaved,
  onBusy,
  autoCapture = false,
}) {
  const [caption, setCaption] = useState(""),
    [asset, setAsset] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(null),
    locked = useRef(false);
  const picking = useRef(false),
    started = useRef(false);
  useEffect(() => {
    if (autoCapture && Platform.OS !== "web" && !started.current) {
      started.current = true;
      pick(true);
    }
  }, []);
  async function save(photo = asset) {
    if (!photo || locked.current) return;
    locked.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    if (!pending.current)
      pending.current = {
        petId,
        asset: photo,
        caption: caption.trim(),
        date: today(),
        requestKey: Crypto.randomUUID(),
      };
    try {
      await uploadMoment(pending.current);
      pending.current = null;
      setAsset(null);
      setCaption("");
      await onSaved();
    } catch (e) {
      setError(`${e.message} Ảnh vẫn được giữ tại đây để bạn thử lại.`);
    } finally {
      locked.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  async function pick(camera) {
    if (picking.current || locked.current) return;
    picking.current = true;
    onBusy(true);
    setError("");
    try {
      const selected = await selectPhoto(camera);
      if (!selected) return;
      setAsset(selected);
      pending.current = null;
      if (camera) await save(selected);
    } catch (e) {
      setError(e.message);
    } finally {
      picking.current = false;
      onBusy(false);
    }
  }
  return (
    <Card>
      <Text style={{ fontSize: 19, lineHeight: 28, fontWeight: "700" }}>
        Lưu lại khoảnh khắc
      </Text>
      <Caption>
        {Platform.OS === "web"
          ? "Chọn ảnh từ máy tính, thêm lời nhắn rồi lưu."
          : "Thêm lời nhắn trước khi chụp. Xác nhận ảnh xong, khoảnh khắc sẽ tự lưu."}
      </Caption>
      <TextField
        label="Lời nhắn cho khoảnh khắc"
        placeholder="Hôm nay bé có gì đáng yêu?"
        multiline
        value={caption}
        editable={!busy && !pending.current}
        onChangeText={setCaption}
      />
      {asset && (
        <Image
          source={{ uri: asset.uri }}
          style={{
            width: "100%",
            height: 250,
            borderRadius: 16,
            marginTop: 12,
          }}
          resizeMode="cover"
        />
      )}
      <ErrorText error={error} />
      {Platform.OS !== "web" && (
        <PrimaryButton
          title="Chụp ảnh · Tự động lưu"
          disabled={busy}
          loading={busy}
          onPress={() => pick(true)}
        />
      )}
      <PrimaryButton
        title={Platform.OS === "web" ? "Chọn file ảnh" : "Chọn từ thư viện"}
        disabled={busy}
        variant="secondary"
        onPress={() => pick(false)}
      />
      {asset && (
        <View>
          <PrimaryButton
            title={pending.current ? "Thử lưu lại" : "Lưu khoảnh khắc"}
            loading={busy}
            onPress={() => save()}
          />
          <PrimaryButton
            title="Bỏ ảnh"
            variant="secondary"
            disabled={busy}
            onPress={() => {
              setAsset(null);
              pending.current = null;
              setError("");
            }}
          />
        </View>
      )}
    </Card>
  );
}
