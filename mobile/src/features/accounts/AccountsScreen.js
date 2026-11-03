import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { colors, fonts, radius, shadow } from "../../theme";
import WorkHeader from "../../components/WorkHeader";
import FormField from "../../components/FormField";
import { FilterChipRow } from "../../components/FilterChip";
import Button from "../../components/Button";
import Avatar from "../../components/Avatar";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { ConfirmSheet } from "../../components/BottomSheet";
import { useToast } from "../../components/Toast";

const ROLES = [
  { id: "owner", label: "Người dùng", icon: "person-outline" },
  { id: "staff", label: "Nhân viên", icon: "id-card-outline" },
  { id: "manager", label: "Quản lý", icon: "storefront-outline" },
  { id: "admin", label: "Quản trị", icon: "shield-checkmark-outline" },
];
const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;

function AccountCard({ account, self, disabled, onAsk }) {
  const [role, setRole] = useState(account.role);
  return (
    <View style={[styles.card, !account.isActive && { opacity: 0.85 }]}>
      <View style={styles.head}>
        <Avatar uri={account.avatarUrl} label={account.displayName || account.email} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {account.displayName || "Chưa đặt tên"}
            {self ? " (bạn)" : ""}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {account.email}
          </Text>
        </View>
        <StatusBadge size="sm" label={account.isActive ? "Hoạt động" : "Đã khóa"} icon={account.isActive ? "checkmark-circle" : "lock-closed"} fg={account.isActive ? colors.success : colors.danger} bg={account.isActive ? colors.successSoft : colors.dangerSoft} />
      </View>
      {self ? (
        <Text style={styles.selfNote}>Bạn không thể tự đổi quyền hoặc khóa tài khoản của chính mình.</Text>
      ) : (
        <>
          <Text style={styles.label}>Vai trò</Text>
          <FilterChipRow wrap options={ROLES} value={role} onChange={setRole} disabled={disabled} />
          <View style={styles.actions}>
            <Button title="Lưu vai trò" icon="checkmark" size="sm" disabled={disabled || role === account.role} onPress={() => onAsk(account, { role, isActive: !!account.isActive }, "role")} style={{ flex: 1 }} />
            <Button
              title={account.isActive ? "Khóa" : "Mở khóa"}
              icon={account.isActive ? "lock-closed-outline" : "lock-open-outline"}
              size="sm"
              variant={account.isActive ? "danger" : "secondary"}
              disabled={disabled}
              onPress={() => onAsk(account, { role: account.role, isActive: !account.isActive }, account.isActive ? "lock" : "unlock")}
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}
    </View>
  );
}

export default function AccountsScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(null);

  const load = useCallback(
    async (next = 1) => {
      setStatus(next === 1 ? "loading" : "more");
      setError("");
      try {
        const r = await api(`/admin/accounts?page=${next}&limit=50&search=${encodeURIComponent(query)}`);
        setItems((old) => (next === 1 ? r.items : [...old, ...r.items]));
        setPage(next);
        setMore(r.hasMore);
        setStatus("ready");
      } catch (e) {
        setError(e.message);
        setStatus("error");
      }
    },
    [query],
  );
  useEffect(() => {
    load(1);
  }, [load]);
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const shown = useMemo(() => (roleFilter === "all" ? items : roleFilter === "locked" ? items.filter((a) => !a.isActive) : items.filter((a) => a.role === roleFilter)), [items, roleFilter]);

  async function confirmUpdate() {
    if (!ask) return;
    setBusy(true);
    try {
      await api(`/admin/accounts/${ask.account.id}`, { method: "PATCH", body: ask.body });
      toast.success(`Đã cập nhật tài khoản ${ask.account.email}`);
      setAsk(null);
      await load(1);
    } catch (e) {
      setAsk(null);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (user?.role !== "admin") return <Redirect href="/" />;
  const askText = ask
    ? ask.kind === "role"
      ? { title: "Đổi vai trò tài khoản?", message: `${ask.account.email} sẽ chuyển từ “${roleLabel(ask.account.role)}” sang “${roleLabel(ask.body.role)}”. Quyền truy cập thay đổi ngay sau khi họ làm mới ứng dụng.`, label: "Đổi vai trò", icon: "swap-horizontal" }
      : ask.kind === "lock"
        ? { title: "Khóa tài khoản này?", message: `${ask.account.email} sẽ bị đăng xuất và không thể đăng nhập cho tới khi được mở khóa.`, label: "Khóa tài khoản", icon: "lock-closed-outline", destructive: true }
        : { title: "Mở khóa tài khoản?", message: `${ask.account.email} có thể đăng nhập lại.`, label: "Mở khóa", icon: "lock-open-outline" }
    : {};

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <WorkHeader />
        <Text style={styles.title}>Quản lý tài khoản</Text>
        <Text style={styles.sub}>Phân quyền Quản trị, Quản lý, Nhân viên và khóa/mở khóa tài khoản.</Text>
        <FormField icon="search" placeholder="Tìm theo tên hoặc email…" value={search} onChangeText={setSearch} onSubmitEditing={() => setQuery(search.trim())} style={{ marginTop: 14, marginBottom: 6 }} accessibilityLabel="Tìm tài khoản" />
        <FilterChipRow
          tone="accent"
          value={roleFilter}
          onChange={setRoleFilter}
          options={[{ id: "all", label: "Tất cả" }, ...ROLES.map((r) => ({ id: r.id, label: r.label })), { id: "locked", label: "Đã khóa", icon: "lock-closed-outline" }]}
          style={{ marginBottom: 10 }}
        />
        {status === "ready" && (
          <Text style={styles.count} accessibilityLiveRegion="polite">
            Hiển thị {shown.length}/{items.length}
            {more ? "+" : ""} tài khoản
          </Text>
        )}
        {status === "loading" ? (
          <LoadingSkeleton variant="list" count={4} />
        ) : status === "error" ? (
          <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được tài khoản" message={error} actionLabel="Thử lại" onAction={() => load(1)} />
        ) : !shown.length ? (
          <EmptyState compact icon="search" title="Không tìm thấy tài khoản phù hợp" message="Thử từ khóa khác hoặc bỏ bộ lọc vai trò." actionLabel="Xóa bộ lọc" onAction={() => { setSearch(""); setRoleFilter("all"); }} />
        ) : (
          shown.map((a) => <AccountCard key={`${a.id}-${a.role}-${a.isActive}`} account={a} self={a.id.toLowerCase() === user.id.toLowerCase()} disabled={busy} onAsk={(account, body, kind) => setAsk({ account, body, kind })} />)
        )}
        {more && status !== "loading" && <Button title="Tải thêm tài khoản" variant="outline" icon="chevron-down" loading={status === "more"} onPress={() => load(page + 1)} full style={{ marginTop: 8 }} />}
      </ScrollView>
      <ConfirmSheet visible={!!ask} onClose={() => setAsk(null)} onConfirm={confirmUpdate} loading={busy} destructive={askText.destructive} icon={askText.icon} title={askText.title} message={askText.message} confirmLabel={askText.label} cancelLabel="Hủy" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 60, maxWidth: 860, width: "100%", alignSelf: "center" },
  title: { fontFamily: fonts.black, fontSize: 22, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.inkSoft, marginTop: 2 },
  count: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkSoft, marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontFamily: fonts.heavy, fontSize: 15.5, color: colors.ink },
  email: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  selfNote: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkSoft, marginTop: 12, backgroundColor: colors.backgroundAlt, borderRadius: radius.sm, padding: 10 },
  label: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink, marginTop: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
});
