import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { selectPhoto, uploadAvatar } from "../services/media";
import SmartImage from "./SmartImage";
import Pressy from "./Pressy";
import Icon from "./Icon";
import BottomSheet from "./BottomSheet";
import Button from "./Button";

/**
 * Ảnh đại diện trong khung tròn với biểu tượng máy ảnh.
 * Chạm để chọn / chụp / bỏ ảnh. Có tiến trình tải lên.
 */
export default function AvatarEditor({ value, onChange, label = "Ảnh đại diện", disabled = false, onBusy = () => {}, size = 120, fallback = "paw" }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState(false);

  async function choose(camera) {
    setSheet(false);
    setError("");
    try {
      const asset = await selectPhoto(camera, { square: true });
      if (!asset) return;
      setBusy(true);
      onBusy(true);
      setProgress(0.02);
      const response = await uploadAvatar(asset, setProgress);
      onChange(response.avatarUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      onBusy(false);
      setProgress(0);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressy
        onPress={() => (Platform.OS === "web" ? choose(false) : setSheet(true))}
        disabled={disabled || busy}
        feedback="tap"
        scaleTo={0.95}
        accessibilityLabel={`${label}. ${value ? "Đổi ảnh" : "Thêm ảnh"}`}
        style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <SmartImage uri={value} rounded style={{ width: size - 8, height: size - 8, borderRadius: size }} fallback={fallback} />
        {busy && (
          <View style={[styles.progressWrap, { borderRadius: size }]}>
            <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          </View>
        )}
        <View style={styles.camera}>
          <Icon name="camera" size={18} color={colors.primaryDark} />
        </View>
      </Pressy>
      <Text style={styles.label}>{busy ? "Đang tải ảnh lên…" : value ? "Chạm để đổi ảnh" : label}</Text>
      {busy && (
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.max(4, progress * 100)}%` }]} />
        </View>
      )}
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title={label} scroll={false}>
        <View style={{ gap: 10 }}>
          <Button title="Chụp ảnh mới" icon="camera-outline" onPress={() => choose(true)} full />
          <Button title="Chọn từ thư viện" icon="images-outline" variant="secondary" onPress={() => choose(false)} full />
          {!!value && (
            <Button
              title="Bỏ ảnh hiện tại"
              icon="trash-outline"
              variant="danger"
              onPress={() => {
                setSheet(false);
                onChange(null);
              }}
              full
            />
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginVertical: 10 },
  frame: { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.accent, borderStyle: "dashed" },
  progressWrap: { ...StyleSheet.absoluteFillObject, margin: 4, backgroundColor: "rgba(7,26,58,0.5)", alignItems: "center", justifyContent: "center" },
  progressText: { fontFamily: fonts.black, color: colors.white, fontSize: 18 },
  camera: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.inkSoft, marginTop: 10 },
  bar: { width: 160, height: 6, borderRadius: 3, backgroundColor: colors.primarySoft, marginTop: 8, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 3 },
  error: { fontFamily: fonts.bold, fontSize: 13, color: colors.danger, textAlign: "center", marginTop: 6, maxWidth: 320 },
});
