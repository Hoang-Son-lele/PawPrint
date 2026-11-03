import React, { useCallback, useState } from "react";
import { ScrollView, Text, Alert, Platform } from "react-native";
import { useFocusEffect, Redirect } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import {
  Title,
  Caption,
  Card,
  TextField,
  PrimaryButton,
  ErrorText,
} from "../../components/UI";
import ChoiceChips from "../../components/ChoiceChips";
import WorkHeader from "../../components/WorkHeader";
const roles = [
  { id: "owner", label: "Người dùng" },
  { id: "manager", label: "Manager · Quản lý" },
  { id: "staff", label: "Staff · Nhân viên" },
  { id: "admin", label: "Quản trị viên" },
];
function AccountCard({ account, currentId, onChange, disabled }) {
  const [role, setRole] = useState(account.role);
  const self = account.id.toLowerCase() === currentId.toLowerCase();
  function update(active = !!account.isActive) {
    const action = () => onChange(account.id, { role, isActive: active });
    const message = `Cập nhật quyền và trạng thái của ${account.email}?`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) action();
    } else
      Alert.alert("Cập nhật tài khoản", message, [
        { text: "Hủy", style: "cancel" },
        { text: "Xác nhận", onPress: action },
      ]);
  }
  return (
    <Card>
      <Text style={{ fontWeight: "700", fontSize: 17, lineHeight: 25 }}>
        {account.displayName || "Chưa đặt tên"}
      </Text>
      <Caption>{account.email}</Caption>
      <Caption>
        {account.isActive ? "Đang hoạt động" : "Đã khóa"}
        {self ? " · Tài khoản của bạn" : ""}
      </Caption>
      <ChoiceChips
        options={roles}
        value={role}
        onChange={setRole}
        disabled={disabled || self}
      />
      <PrimaryButton
        title="Lưu quyền"
        disabled={disabled || self || role === account.role}
        onPress={() => update()}
      />
      <PrimaryButton
        title={account.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
        variant="secondary"
        disabled={disabled || self}
        onPress={() => update(!account.isActive)}
      />
    </Card>
  );
}
export default function AccountsScreen() {
  const { user } = useAuth(),
    [items, setItems] = useState([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false);
  async function load(next = 1) {
    setBusy(true);
    setError("");
    try {
      const r = await api(
        `/admin/accounts?page=${next}&search=${encodeURIComponent(search)}`,
      );
      setItems((old) => (next === 1 ? r.items : [...old, ...r.items]));
      setPage(next);
      setMore(r.hasMore);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );
  async function update(id, body) {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/accounts/${id}`, { method: "PATCH", body });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (user?.role !== "admin") return <Redirect href="/" />;
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 60,
        maxWidth: 850,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <WorkHeader />
      <Title>Quản lý tài khoản</Title>
      <Caption>Nâng, hạ quyền Admin, Manager, Staff và khóa hoặc mở khóa tài khoản.</Caption>
      <TextField
        label="Tìm tên hoặc email"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => load()}
      />
      <PrimaryButton title="Tìm kiếm" disabled={busy} onPress={() => load()} />
      <ErrorText error={error} />
      {items.map((a) => (
        <AccountCard
          key={`${a.id}-${a.role}-${a.isActive}`}
          account={a}
          currentId={user.id}
          disabled={busy}
          onChange={update}
        />
      ))}
      {!busy && !items.length && (
        <Caption>Không tìm thấy tài khoản phù hợp.</Caption>
      )}
      {more && (
        <PrimaryButton
          title="Xem thêm tài khoản"
          disabled={busy}
          onPress={() => load(page + 1)}
        />
      )}
    </ScrollView>
  );
}
