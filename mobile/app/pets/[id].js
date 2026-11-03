import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../src/services/api";
import { Caption, Card, ErrorText, Page } from "../../src/components/UI";
import FloatingHearts from "../../src/components/FloatingHearts";
import { palette } from "../../src/theme";
import Avatar from "../../src/components/Avatar";

const emoji = { dog: "🐶", cat: "🐱", other: "🐾" };

export default function PetDetails() {
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [pet, setPet] = useState(null);
  const [together, setTogether] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const heartbeat = useRef(new Animated.Value(1)).current;
  const heartSize = Math.min(width * 0.9, 660);
  const daysTogether = Number(together?.days) || 0;
  const progress = Math.max(0, Math.min(daysTogether / 100, 1));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api(`/pets/${id}`);
      setPet(result.pet);
      try {
        setTogether(await api(`/pets/${id}/together-days`));
      } catch (requestError) {
        setTogether(null);
        setError(requestError.message);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(heartbeat, {
          toValue: 1.055,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartbeat, {
          toValue: 1,
          duration: 680,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    beat.start();
    return () => beat.stop();
  }, [heartbeat]);

  const deletePet = async () => {
    setDeleting(true);
    try {
      await api(`/pets/${id}`, { method: "DELETE" });
      router.replace("/");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  const openSettings = () => setSettingsVisible(true);

  if (loading)
    return (
      <Page style={styles.center}>
        <ActivityIndicator size="large" color={palette.primary} />
      </Page>
    );

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.content}>
        <ErrorText error={error} />
        {pet ? (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.petAvatar}>
                <Avatar uri={pet.avatarUrl} label={pet.name} size={60} />
              </View>
              <View style={styles.profileCopy}>
                <Text style={styles.profileName}>{pet.name}</Text>
                <Text style={styles.profileMeta}>
                  {pet.breed || "Chưa cập nhật giống"} · {pet.species}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cài đặt thú cưng"
                onPress={openSettings}
                style={styles.settingsButton}
              >
                <Text style={styles.settingsIcon}>⚙</Text>
              </Pressable>
            </View>

            <View style={[styles.heartStage, { height: heartSize * 0.92 }]}>
              <Animated.View
                style={[
                  styles.heartMotion,
                  { transform: [{ scale: heartbeat }] },
                ]}
              >
                <View
                  pointerEvents="none"
                  style={[styles.heartArtwork, { width: heartSize * 1.12 }]}
                >
                  <Text
                    style={[
                      styles.heartShape,
                      { fontSize: heartSize, lineHeight: heartSize * 0.92 },
                    ]}
                  >
                    ♥
                  </Text>
                  <View
                    style={[
                      styles.progressClip,
                      { height: `${progress * 100}%` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressHeart,
                        { fontSize: heartSize, lineHeight: heartSize * 0.92 },
                      ]}
                    >
                      ♥
                    </Text>
                  </View>
                </View>
                <View pointerEvents="none" style={styles.heartContent}>
                  <Text style={styles.daysLabel}>Bên nhau</Text>
                  <Text style={styles.days}>{together?.days ?? "—"}</Text>
                  <Text style={styles.milestone}>
                    Còn {together?.nextMilestone?.remaining ?? "—"} ngày đến 100
                  </Text>
                </View>
                <FloatingHearts inside />
              </Animated.View>
              <FloatingHearts />
            </View>

            <Card>
              <Text style={styles.cardTitle}>Hồ sơ thú cưng</Text>
              <Caption>Ngày sinh: {pet.birthDate || "Chưa có"}</Caption>
              <Caption>
                Cân nặng: {pet.weightKg ? `${pet.weightKg} kg` : "Chưa có"}
              </Caption>
              <Caption>Ghi chú: {pet.notes || "Chưa có"}</Caption>
            </Card>
          </>
        ) : null}
      </ScrollView>
      <Modal
        transparent
        visible={settingsVisible}
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSettingsVisible(false)}
        >
          <Pressable
            style={styles.settingsMenu}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.menuTitle}>Cài đặt thú cưng</Text>
            {confirmingDelete ? (
              <>
                <Text style={styles.confirmText}>
                  Xóa hồ sơ của {pet?.name}? Hồ sơ sẽ được ẩn.
                </Text>
                <Pressable
                  disabled={deleting}
                  style={styles.deleteAction}
                  onPress={deletePet}
                >
                  <Text style={styles.deleteText}>
                    {deleting ? "Đang xóa…" : "Xóa hồ sơ"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.menuAction}
                  onPress={() => setConfirmingDelete(false)}
                >
                  <Text style={styles.menuActionText}>Quay lại</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={styles.menuAction}
                  onPress={() => {
                    setSettingsVisible(false);
                    router.push(`/pets/${id}/settings`);
                  }}
                >
                  <Text style={styles.menuActionText}>Chỉnh sửa hồ sơ</Text>
                </Pressable>
                <Pressable
                  style={styles.menuAction}
                  onPress={() => setConfirmingDelete(true)}
                >
                  <Text style={styles.deleteText}>Xóa hồ sơ</Text>
                </Pressable>
                <Pressable
                  style={styles.cancelAction}
                  onPress={() => setSettingsVisible(false)}
                >
                  <Text style={styles.menuActionText}>Đóng</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center" },
  content: { paddingTop: 20, paddingBottom: 40 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    padding: 16,
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },
  petAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.peach,
  },
  emoji: { fontSize: 34 },
  profileCopy: { flex: 1, marginLeft: 14 },
  profileName: { color: palette.ink, fontSize: 21, fontWeight: "800" },
  profileMeta: { color: palette.muted, fontSize: 13, marginTop: 4 },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: palette.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsIcon: { color: palette.primary, fontSize: 22 },
  heartStage: {
    marginTop: 8,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heartMotion: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  heartArtwork: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heartShape: {
    color: "#FFE0EC",
    textAlign: "center",
    includeFontPadding: false,
    transform: [{ scaleX: 1.12 }],
  },
  progressClip: {
    position: "absolute",
    bottom: 0,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
  },
  progressHeart: {
    color: "#F52278",
    textAlign: "center",
    includeFontPadding: false,
    transform: [{ scaleX: 1.12 }],
  },
  heartContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    top: "38%",
    left: 0,
    right: 0,
  },
  daysLabel: { color: "#FFFFFF", fontSize: 20, fontWeight: "600" },
  days: { fontSize: 55, fontWeight: "700", color: "#FFFFFF", lineHeight: 66 },
  milestone: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: palette.ink,
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(20, 35, 60, 0.42)",
  },
  settingsMenu: {
    width: "100%",
    maxWidth: 360,
    padding: 20,
    borderRadius: 22,
    backgroundColor: palette.surface,
  },
  menuTitle: {
    color: palette.ink,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 12,
  },
  confirmText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
  },
  menuAction: {
    minHeight: 48,
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  cancelAction: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: palette.subtle,
    borderRadius: 12,
  },
  menuActionText: { color: palette.primary, fontWeight: "700", fontSize: 15 },
  deleteAction: {
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FDEBEC",
    borderRadius: 12,
    marginVertical: 8,
  },
  deleteText: { color: palette.error, fontWeight: "700", fontSize: 15 },
});
