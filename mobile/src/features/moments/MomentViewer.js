import React, { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../services/api";
import { colors, fonts } from "../../theme";
import { formatDate } from "../../utils/format";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import SmartImage from "../../components/SmartImage";
import { IconButton } from "../../components/Button";
import Button from "../../components/Button";
import BottomSheet, { ConfirmSheet } from "../../components/BottomSheet";
import FormField from "../../components/FormField";
import { useToast } from "../../components/Toast";

/**
 * Xem ảnh toàn màn hình: vuốt ngang giữa các ảnh, chạm để hiện/ẩn chú thích,
 * sửa chú thích hoặc xóa khoảnh khắc.
 */
export default function MomentViewer({ items, index, onClose, onChanged }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(index ?? 0);
  const [chrome, setChrome] = useState(true);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const list = useRef(null);
  const visible = index != null;
  const item = items[current];

  useEffect(() => {
    if (visible) {
      setCurrent(index);
      setChrome(true);
    }
  }, [visible, index]);
  useEffect(() => {
    Animated.timing(fade, { toValue: chrome ? 1 : 0, duration: reduced ? 0 : 180, useNativeDriver: Platform.OS !== "web" }).start();
  }, [chrome, reduced, fade]);

  if (!visible || !item) return null;

  async function saveCaption() {
    setBusy(true);
    try {
      await api(`/moments/${item.id}`, { method: "PATCH", body: { caption: caption.trim(), occurredAt: String(item.occurredAt).slice(0, 10) } });
      onChanged({ ...item, caption: caption.trim() });
      setEditing(false);
      toast.success("Đã cập nhật lời kể");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function destroy() {
    setBusy(true);
    try {
      await api(`/moments/${item.id}`, { method: "DELETE" });
      setConfirm(false);
      onChanged(null, item.id);
      toast.info("Đã xóa khoảnh khắc");
      if (items.length <= 1) onClose();
      else setCurrent((c) => Math.max(0, Math.min(c, items.length - 2)));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible animationType={reduced ? "none" : "fade"} onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        <FlatList
          ref={list}
          data={items}
          horizontal
          pagingEnabled
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(m) => m.id}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
          onScroll={Platform.OS === "web" ? (e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width)) : undefined}
          scrollEventThrottle={64}
          renderItem={({ item: m }) => (
            <Pressable onPress={() => setChrome((c) => !c)} style={{ width, height }} accessibilityLabel={chrome ? "Ẩn chú thích" : "Hiện chú thích"}>
              {m.photos?.[0]?.url ? (
                <SmartImage uri={m.photos[0].url} style={{ width, height, backgroundColor: "#000" }} resizeMode="contain" />
              ) : (
                <View style={[styles.textOnly, { width, height }]}>
                  <Text style={styles.textOnlyText}>“{m.caption || "Một ngày đáng nhớ bên bé."}”</Text>
                </View>
              )}
            </Pressable>
          )}
        />
        <Animated.View pointerEvents={chrome ? "box-none" : "none"} style={[styles.top, { paddingTop: insets.top + 8, opacity: fade }]}>
          <IconButton icon="close" label="Đóng" onPress={onClose} variant="light" />
          <Text style={styles.counter}>
            {current + 1} / {items.length}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <IconButton icon="create-outline" label="Sửa lời kể" variant="light" onPress={() => { setCaption(item.caption || ""); setEditing(true); }} />
            <IconButton icon="trash-outline" label="Xóa khoảnh khắc" variant="light" onPress={() => setConfirm(true)} />
          </View>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.bottom, { paddingBottom: insets.bottom + 20, opacity: fade }]}>
          <Text style={styles.meta}>
            {item.pet?.name ? `${item.pet.name} · ` : ""}
            {formatDate(item.occurredAt, { weekday: true })}
          </Text>
          {!!item.caption && <Text style={styles.caption}>{item.caption}</Text>}
        </Animated.View>
      </View>
      <BottomSheet visible={editing} onClose={() => !busy && setEditing(false)} title="Sửa lời kể" footer={<Button title="Lưu lời kể" icon="checkmark" onPress={saveCaption} loading={busy} full />}>
        <FormField label="Lời kể" multiline value={caption} onChangeText={setCaption} maxLength={1000} autoFocus />
      </BottomSheet>
      <ConfirmSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={destroy}
        loading={busy}
        destructive
        title="Xóa khoảnh khắc này?"
        message="Ảnh và lời kể sẽ được ẩn khỏi nhật ký của bé."
        confirmLabel="Xóa khoảnh khắc"
        cancelLabel="Giữ lại"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  top: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 12, backgroundColor: "rgba(0,0,0,0.35)" },
  counter: { fontFamily: fonts.heavy, fontSize: 14, color: colors.white },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 30, backgroundColor: "rgba(0,0,0,0.5)" },
  meta: { fontFamily: fonts.heavy, fontSize: 12.5, color: colors.accent },
  caption: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24, color: colors.white, marginTop: 6 },
  textOnly: { alignItems: "center", justifyContent: "center", padding: 30, backgroundColor: colors.primary },
  textOnlyText: { fontFamily: fonts.heavy, fontSize: 22, lineHeight: 32, color: colors.white, textAlign: "center" },
});

