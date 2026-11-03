import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";

const labels = { admin: "ADMIN · QUẢN TRỊ TÀI KHOẢN", manager: "MANAGER · QUẢN LÝ CỬA HÀNG", staff: "STAFF · NHÂN VIÊN" };
const colors = { admin: "#283454", manager: "#24594B", staff: "#7B4C21" };

export default function WorkHeader() {
  const { user, signOut, refreshUser } = useAuth();
  React.useEffect(() => {
    // Refresh access after an administrator changes this account's role.
    const timer = setInterval(() => { refreshUser().catch(() => {}); }, 30000);
    return () => clearInterval(timer);
  }, [refreshUser]);
  return (
    <View style={[s.header, { backgroundColor: colors[user?.role] || colors.staff }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.brand}>PAWPRINT / KHÔNG GIAN LÀM VIỆC</Text>
        <Text style={s.title}>{labels[user?.role]}</Text>
        <Text style={s.email}>{user?.displayName} · {user?.email}</Text>
      </View>
      <Pressable onPress={signOut} accessibilityRole="button" style={s.button}>
        <Text style={{ color: "white", fontWeight: "700" }}>Đăng xuất</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  header: { padding: 22, borderRadius: 18, marginBottom: 24, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16 },
  brand: { color: "#D5DFEC", fontSize: 11, letterSpacing: 1.5 },
  title: { color: "white", fontSize: 20, fontWeight: "800", marginVertical: 12 },
  email: { color: "#E6ECF3", fontSize: 13 },
  button: { padding: 12, borderWidth: 1, borderColor: "#FFFFFF66", borderRadius: 10 },
});
