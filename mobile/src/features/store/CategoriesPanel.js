import React, { useCallback, useState } from "react";
import { View, Alert, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../../services/api";
import { Title, Caption, Card, TextField, PrimaryButton, ErrorText } from "../../components/UI";

export default function CategoriesPanel() {
  const [items, setItems] = useState([]), [name, setName] = useState("");
  const [editId, setEditId] = useState(null), [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const result = await api("/admin/categories"); setItems(result.items);
  }, []);
  useFocusEffect(useCallback(() => {
    setBusy(true); setError("");
    load().catch(e => setError(e.message)).finally(() => setBusy(false));
  }, [load]));
  async function mutate(path, method, body) {
    setBusy(true); setError("");
    try {
      await api(path, { method, body });
      if (method !== "DELETE" || path.endsWith(`/${editId}`)) { setName(""); setEditId(null); }
      await load();
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function remove(item) {
    const message = `Xóa danh mục “${item.name}”?`;
    const action = () => mutate(`/admin/categories/${item.id}`, "DELETE");
    if (Platform.OS === "web") { if (window.confirm(message)) action(); }
    else Alert.alert("Xóa danh mục", message, [{text:"Hủy",style:"cancel"},{text:"Xóa",style:"destructive",onPress:action}]);
  }
  return <View>
    <Title>Quản lý danh mục</Title>
    <Caption>Đổi tên danh mục sẽ cập nhật sản phẩm liên quan. Chỉ xóa được danh mục chưa có sản phẩm, kể cả sản phẩm đã ngừng bán.</Caption>
    <Card>
      <TextField label={editId ? "Đổi tên danh mục" : "Tên danh mục mới"} value={name} onChangeText={setName} maxLength={80} editable={!busy} />
      <PrimaryButton title={editId ? "Lưu thay đổi" : "Thêm danh mục"} disabled={busy || !name.trim()}
        onPress={() => mutate(`/admin/categories${editId ? `/${editId}` : ""}`, editId ? "PUT" : "POST", {name:name.trim()})} />
      {editId && <PrimaryButton title="Hủy chỉnh sửa" variant="secondary" disabled={busy} onPress={() => {setName("");setEditId(null);}} />}
    </Card>
    <ErrorText error={error} />
    <PrimaryButton title="Tải lại danh mục" variant="secondary" disabled={busy} onPress={() => {
      setBusy(true);setError("");load().catch(e=>setError(e.message)).finally(()=>setBusy(false));
    }} />
    {!busy && !items.length && <Caption>Chưa có danh mục. Thêm danh mục đầu tiên để tạo sản phẩm.</Caption>}
    {items.map(item => <Card key={item.id}>
      <Title>{item.name}</Title><Caption>{item.productCount} sản phẩm</Caption>
      <PrimaryButton title="Chỉnh sửa" variant="secondary" disabled={busy} onPress={() => {setEditId(item.id);setName(item.name);}} />
      <PrimaryButton title="Xóa danh mục" variant="secondary" disabled={busy || item.productCount > 0} onPress={() => remove(item)} />
    </Card>)}
  </View>;
}
