import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { colors, fonts, radius } from "../theme";
import Avatar from "./Avatar";
import Button from "./Button";
import { ConfirmSheet } from "./BottomSheet";
import { Paw } from "./Decor";

const ROLE = {
  admin: { label: "Quản trị viên", icon: "shield-checkmark", hint: "Quản lý tài khoản & phân quyền" },
  manager: { label: "Quản lý cửa hàng", icon: "storefront", hint: "Điều hành Pet Shop" },
  staff: { label: "Nhân viên cửa hàng", icon: "id-card", hint: "Xử lý sản phẩm & đơn hàng" },
};

/** Header không gian làm việc – giữ phong cách PawPrint, ưu tiên rõ ràng. */
export default function WorkHeader() {
  const { user, signOut, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false);
  React.useEffect(() => {
    // Làm mới quyền sau khi quản trị viên đổi vai trò tài khoản này.
    const timer = setInterval(() => {
      refreshUser().catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [refreshUser]);
  const role = ROLE[user?.role] || ROLE.staff;
  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <Paw size={64} color="#FFFFFF" opacity={0.06} rotate={-18} style={{ position: "absolute", right: 20, top: insets.top + 6 }} />
      <Paw size={34} color={colors.accent} opacity={0.25} rotate={20} style={{ position: "absolute", right: 90, bottom: 14 }} />
      <View style={styles.row}>
        <Avatar uri={user?.avatarUrl} label={user?.displayName || user?.email || "?"} size={52} ring />
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>PAWPRINT · KHÔNG GIAN LÀM VIỆC</Text>
          <Text style={styles.name} numberOfLines={1}>
            {user?.displayName || user?.email}
          </Text>
          <View style={styles.role}>
            <Text style={styles.roleText}>{role.label}</Text>
          </View>
        </View>
        <Button title="Đăng xuất" icon="log-out-outline" variant="light" size="sm" onPress={() => setConfirm(true)} />
      </View>
      <ConfirmSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={signOut}
        icon="log-out-outline"
        title="Đăng xuất khỏi PawPrint?"
        message="Bạn sẽ cần đăng nhập lại để tiếp tục làm việc."
        confirmLabel="Đăng xuất"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    marginHorizontal: -20,
    marginBottom: 18,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap" },
  brand: { fontFamily: fonts.heavy, color: "#AFC6EA", fontSize: 10.5, letterSpacing: 1.4 },
  name: { fontFamily: fonts.black, color: colors.white, fontSize: 20, marginTop: 2 },
  role: { alignSelf: "flex-start", marginTop: 6, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  roleText: { fontFamily: fonts.heavy, color: colors.primaryDark, fontSize: 11.5 },
});
