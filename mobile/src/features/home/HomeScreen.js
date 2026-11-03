import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { palette as c, typography } from "../../theme";
import { ErrorText, PrimaryButton } from "../../components/UI";
import Avatar from "../../components/Avatar";
const emoji = { dog: "🐶", cat: "🐱", other: "🐾" };
const features = [
  {
    path: "/moments",
    icon: "📸",
    title: "Khoảnh khắc",
    description: "Lưu ảnh và những điều đáng nhớ",
    color: c.peach,
  },
  {
    path: "/care",
    icon: "🩺",
    title: "Chăm sóc",
    description: "Nhật ký sức khỏe mỗi ngày",
    color: c.subtle,
  },
  {
    path: "/timeline",
    icon: "🗓️",
    title: "Hành trình",
    description: "Nhìn lại những ngày bên nhau",
    color: "#FFF5D9",
  },
  {
    path: "/shop",
    icon: "🛍️",
    title: "Pet Shop",
    description: "Mua sắm những món bé cần",
    color: "#EDF5EF",
  },
];
export default function HomeScreen() {
  const { user, signOut, refreshUser } = useAuth(),
    [pets, setPets] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const r = await api("/pets");
      setPets(r.items);
      await refreshUser();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [refreshUser]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.body}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
    >
      <View style={s.top}>
        <Pressable onPress={() => router.push("/profile")} accessibilityLabel="Mở hồ sơ cá nhân">
          <Avatar uri={user?.avatarUrl} label={user?.displayName || "Tôi"} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.brand}>PAWPRINT</Text>
          <Text style={s.hello}>
            Xin chào, {user?.displayName?.split(" ")[0] || "bạn"}!
          </Text>
          <Text style={s.muted}>Một ngày mới cùng người bạn nhỏ.</Text>
        </View>
        <Pressable onPress={signOut} accessibilityLabel="Đăng xuất">
          <Text style={s.link}>Đăng xuất</Text>
        </Pressable>
      </View>
      <PrimaryButton title="Hồ sơ của tôi" variant="secondary" onPress={() => router.push("/profile")} />
      <View style={s.hero}>
        <Text style={s.tag}>NHẬT KÝ YÊU THƯƠNG</Text>
        <Text style={s.heroTitle}>
          Mỗi khoảnh khắc,{"\n"}một câu chuyện nhỏ.
        </Text>
        <Text style={s.heroCopy}>
          Lưu giữ những ngày tuyệt vời bên người bạn bốn chân.
        </Text>
        <PrimaryButton
          title={
            Platform.OS === "web"
              ? "Chọn ảnh · Lưu khoảnh khắc"
              : "Chụp ảnh · Lưu khoảnh khắc"
          }
          variant="secondary"
          onPress={() =>
            router.push(
              Platform.OS === "web" ? "/moments" : "/moments?capture=1",
            )
          }
        />
      </View>
      <View style={s.heading}>
        <Text style={s.h2}>Các bé nhà mình</Text>
        <Pressable onPress={() => router.push("/pets/new")}>
          <Text style={s.link}>+ Thêm bé</Text>
        </Pressable>
      </View>
      <ErrorText error={error} />
      {pets.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => router.push(`/pets/${p.id}`)}
          style={s.pet}
        >
          <Avatar uri={p.avatarUrl} label={p.name} size={54} />
          <View style={{ flex: 1 }}>
            <Text style={s.petName}>{p.name}</Text>
            <Text style={s.muted}>
              {p.breed ||
                { cat: "Mèo", dog: "Chó", other: "Thú cưng" }[p.species]}{" "}
              · Xem hồ sơ
            </Text>
          </View>
          <Text style={s.link}>›</Text>
        </Pressable>
      ))}
      {!pets.length && !busy && (
        <Text style={s.muted}>Thêm hồ sơ đầu tiên để bắt đầu hành trình.</Text>
      )}
      <Text style={[s.h2, { marginVertical: 20 }]}>Khám phá PawPrint</Text>
      <View style={s.tiles}>
        {features.map((f) => (
          <Pressable
            key={f.path}
            onPress={() => router.push(f.path)}
            style={[s.tile, { backgroundColor: f.color }]}
          >
            <Text style={s.tileIcon}>{f.icon}</Text>
            <Text style={s.tileTitle}>{f.title}</Text>
            <Text style={s.muted}>{f.description}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton
        title="Nhắc nhở và tổng kết"
        variant="secondary"
        onPress={() => router.push("/insights")}
      />
      <Text style={s.footer}>Mỗi dấu chân, một câu chuyện.</Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.background },
  body: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    padding: 22,
    paddingBottom: 50,
  },
  top: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  brand: {
    ...typography.heading,
    fontSize: 11,
    letterSpacing: 2,
    color: c.primary,
    marginBottom: 8,
  },
  hello: { ...typography.heading, fontSize: 25, lineHeight: 34, color: c.ink },
  muted: {
    ...typography.regular,
    color: c.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 5,
  },
  link: { ...typography.heading, fontSize: 14, color: c.primary },
  hero: { backgroundColor: c.primary, borderRadius: 24, padding: 24 },
  tag: {
    ...typography.heading,
    color: c.gold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  heroTitle: {
    ...typography.heading,
    color: "white",
    fontSize: 28,
    lineHeight: 39,
    marginVertical: 14,
  },
  heroCopy: {
    color: "#EAF1FC",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 10,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 28,
    marginBottom: 14,
  },
  h2: { ...typography.heading, fontSize: 20, lineHeight: 28, color: c.ink },
  pet: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  petEmoji: { fontSize: 34 },
  petName: {
    ...typography.heading,
    fontSize: 18,
    lineHeight: 26,
    color: c.ink,
  },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: "46%",
    borderRadius: 20,
    padding: 20,
    minHeight: 165,
  },
  tileIcon: { fontSize: 28, marginBottom: 14 },
  tileTitle: {
    ...typography.heading,
    fontSize: 18,
    lineHeight: 26,
    color: c.ink,
  },
  footer: {
    fontSize: 13,
    lineHeight: 22,
    color: c.muted,
    textAlign: "center",
    marginTop: 30,
  },
});
