import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/services/api";
import { useAuth } from "../src/context/AuthContext";
import { usePets } from "../src/context/PetsContext";
import { colors, fonts, radius, shadow } from "../src/theme";
import { species } from "../src/utils/format";
import Screen from "../src/components/Screen";
import Avatar from "../src/components/Avatar";
import Button from "../src/components/Button";
import Pressy from "../src/components/Pressy";
import FadeIn from "../src/components/FadeIn";
import Icon from "../src/components/Icon";
import { Skeleton } from "../src/components/LoadingSkeleton";
import { ConfirmSheet } from "../src/components/BottomSheet";
import { Paw, Sparkle } from "../src/components/Decor";
import { useCartCount, cartStore } from "../src/features/shop/cartStore";

function Row({ icon, color = colors.primary, bg = colors.primarySoft, title, sub, onPress, right }) {
  return (
    <Pressy onPress={onPress} scaleTo={0.98} style={styles.row} accessibilityLabel={sub ? `${title}. ${sub}` : title}>
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {right}
      <Icon name="chevron-forward" size={18} color={colors.muted} />
    </Pressy>
  );
}

function Group({ title, children }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user, signOut, refreshUser } = useAuth();
  const { pets } = usePets();
  const cartCount = useCartCount();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await api("/profile");
      setProfile({ ...r.profile, exists: r.exists });
    } catch (e) {
      setError(e.message);
    }
    cartStore.refresh();
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const name = profile?.displayName || user?.displayName || "Bạn";
  return (
    <Screen
      padded={false}
      contentStyle={{ paddingTop: 0 }}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await Promise.all([load(), refreshUser().catch(() => {})]);
        setRefreshing(false);
      }}
    >
      <View style={[styles.hero, { paddingTop: insets.top + 22 }]}>
        <Paw size={90} color="#FFFFFF" opacity={0.05} rotate={-18} style={{ position: "absolute", right: -10, top: insets.top + 10 }} />
        <Sparkle size={14} style={{ position: "absolute", left: 30, top: insets.top + 24 }} />
        <FadeIn from="scale" style={{ alignItems: "center" }}>
          <View style={styles.avatarRing}>
            <Avatar uri={profile?.avatarUrl ?? user?.avatarUrl} label={name} size={96} />
          </View>
          {profile ? (
            <>
              <Text style={styles.name} accessibilityRole="header">
                {name}
              </Text>
              <Text style={styles.email}>{profile.email || user?.email}</Text>
              {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
            </>
          ) : (
            <View style={{ alignItems: "center", gap: 8, marginTop: 14 }}>
              <Skeleton width={160} height={20} />
              <Skeleton width={200} height={14} />
            </View>
          )}
          <Button title={profile?.exists ? "Chỉnh sửa hồ sơ" : "Hoàn thiện hồ sơ"} icon="create-outline" variant="accent" size="sm" onPress={() => router.push("/profile-edit")} style={{ marginTop: 14 }} />
        </FadeIn>
      </View>

      <View style={styles.body}>
        {!!error && (
          <View style={styles.error} accessibilityRole="alert">
            <Icon name="cloud-offline-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Thử lại" size="sm" variant="danger" onPress={load} />
          </View>
        )}

        <Group title="Thú cưng của tôi">
          {pets.map((p) => (
            <Pressy key={p.id} onPress={() => router.push(`/pets/${p.id}`)} scaleTo={0.98} style={styles.row} accessibilityLabel={`${p.name}, ${species(p.species).label}. Mở hồ sơ`}>
              <Avatar uri={p.avatarUrl} label={p.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{p.name}</Text>
                <Text style={styles.rowSub}>
                  {species(p.species).emoji} {p.breed || species(p.species).label}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.muted} />
            </Pressy>
          ))}
          <Row icon="add" color={colors.primaryDark} bg={colors.accent} title={pets.length ? "Thêm bé mới" : "Thêm bé đầu tiên"} onPress={() => router.push("/pets/new")} />
        </Group>

        <Group title="Mua sắm">
          <Row icon="receipt-outline" title="Đơn hàng của tôi" sub="Theo dõi trạng thái giao hàng" onPress={() => router.push("/orders")} />
          <Row
            icon="bag-handle-outline"
            title="Giỏ hàng"
            sub={cartCount ? `${cartCount} sản phẩm đang chờ` : "Chưa có sản phẩm"}
            onPress={() => router.push("/cart")}
            right={cartCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            ) : null}
          />
        </Group>

        <Group title="Cài đặt tài khoản">
          <Row icon="person-circle-outline" title="Thông tin cá nhân" sub="Tên hiển thị, ảnh đại diện, giới thiệu" onPress={() => router.push("/profile-edit")} />
          <Row icon="sparkles-outline" color={colors.accentDark} bg={colors.accentSoft} title="Tổng kết tháng" sub="Album nhỏ mỗi tháng của các bé" onPress={() => router.push("/insights")} />
          <Row icon="git-commit-outline" color={colors.lilac} bg={colors.lilacSoft} title="Hành trình" sub="Dòng thời gian bên nhau" onPress={() => router.push("/timeline")} />
        </Group>

        <Button title="Đăng xuất" icon="log-out-outline" variant="danger" onPress={() => setConfirm(true)} style={{ marginTop: 28 }} full />
        <Text style={styles.version}>PawPrint · Mỗi dấu chân, một câu chuyện</Text>
      </View>
      <ConfirmSheet visible={confirm} onClose={() => setConfirm(false)} onConfirm={signOut} icon="log-out-outline" title="Đăng xuất khỏi PawPrint?" message="Dữ liệu của bạn vẫn được lưu an toàn. Hẹn gặp lại bạn và các bé nhé!" confirmLabel="Đăng xuất" cancelLabel="Ở lại" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, paddingBottom: 26, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden" },
  avatarRing: { padding: 4, borderRadius: 60, backgroundColor: colors.accent },
  name: { fontFamily: fonts.black, fontSize: 24, color: colors.white, marginTop: 12 },
  email: { fontFamily: fonts.bold, fontSize: 13.5, color: "#C5D7F3", marginTop: 2 },
  bio: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: "#E1EBFA", textAlign: "center", marginTop: 8, maxWidth: 420 },
  body: { paddingHorizontal: 18, width: "100%", maxWidth: 760, alignSelf: "center" },
  error: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 12, marginTop: 16 },
  errorText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.danger },
  groupTitle: { fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: colors.accentDark, marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...shadow.soft },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60, borderBottomWidth: 1, borderBottomColor: "#F3EEE5" },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.inkSoft, marginTop: 1 },
  badge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { fontFamily: fonts.black, fontSize: 12, color: colors.primaryDark },
  version: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.muted, textAlign: "center", marginTop: 16 },
});
