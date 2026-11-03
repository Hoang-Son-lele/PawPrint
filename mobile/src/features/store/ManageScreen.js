import React, { useCallback, useRef, useState } from "react";
import { ScrollView, Text, Alert, Platform } from "react-native";
import { useFocusEffect, Redirect, router } from "expo-router";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  Title,
  Caption,
  Card,
  PrimaryButton,
  ErrorText,
} from "../../components/UI";
import ChoiceChips from "../../components/ChoiceChips";
import WorkHeader from "../../components/WorkHeader";
import TrafficPanel from "./TrafficPanel";
import CategoriesPanel from "./CategoriesPanel";
import ProductEditor, { emptyProduct } from "./ProductEditor";
import OrderCard from "./OrderCard";
import { money } from "../../utils/format";
export default function ManageScreen() {
  const { user } = useAuth(),
    [tab, setTab] = useState("add-product"),
    [items, setItems] = useState([]),
    [form, setForm] = useState(emptyProduct),
    [editId, setEditId] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false);
  const scroll = useRef(null);
  async function load(next = 1) {
    if (!["products", "orders"].includes(tab)) return;
    setBusy(true);
    setError("");
    try {
      const r = await api(`/admin/${tab}?page=${next}`);
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
      setItems([]);
      load();
    }, [tab]),
  );
  async function save() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (!form.category?.trim()) throw new Error("Vui lòng chọn danh mục sản phẩm.");
      if (!form.price.trim() || !form.stock.trim())
        throw new Error("Vui lòng nhập giá và tồn kho.");
      await api(`/admin/products${editId ? `/${editId}` : ""}`, {
        method: editId ? "PUT" : "POST",
        body: { ...form, price: Number(form.price), stock: Number(form.stock) },
      });
      setForm(emptyProduct);
      setEditId(null);
      setSuccess(editId ? "Đã cập nhật sản phẩm thành công." : "Đã thêm sản phẩm thành công.");
      if (editId) setTab("products");
      scroll.current?.scrollTo({y:0,animated:true});
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function mutate(path, method, body) {
    setBusy(true);
    setError("");
    try {
      await api(path, { method, body });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function confirm(message, action) {
    if (Platform.OS === "web") {
      if (window.confirm(message)) action();
    } else
      Alert.alert("Xác nhận", message, [
        { text: "Hủy", style: "cancel" },
        { text: "Đồng ý", onPress: action },
      ]);
  }
  if (!["manager", "staff"].includes(user?.role)) return <Redirect href="/" />;
  return (
    <ScrollView
      ref={scroll}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 60,
        maxWidth: 960,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <WorkHeader />
      <Title>{user?.role === "manager" ? "Điều hành Pet Shop" : "Quầy làm việc Pet Shop"}</Title>
      <Caption>Thêm, sửa, ngừng bán sản phẩm và xử lý đơn hàng của khách.</Caption>
      <PrimaryButton title="Xem shop" variant="secondary" onPress={() => router.push("/shop")} />
      <ChoiceChips
        options={[
          { id: "products", label: "Sản phẩm" },
          { id: "add-product", label: editId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm" },
          { id: "categories", label: "Danh mục" },
          { id: "orders", label: "Đơn hàng" },
          { id: "traffic", label: "Traffic & thống kê" },
        ]}
        value={tab}
        onChange={next => {
          setError(""); setSuccess("");
          if (next === "add-product" && editId) { setEditId(null); setForm(emptyProduct); }
          setTab(next);
        }}
        disabled={busy}
      />
      <ErrorText error={error} />
      {!!success && <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
        style={{color:"#24594B",backgroundColor:"#EAF6EE",padding:16,borderRadius:12,marginVertical:12,fontWeight:"700"}}>{success}</Text>}
      {tab === "traffic" && <TrafficPanel />}
      {tab === "categories" && <CategoriesPanel />}
      {tab === "add-product" && (
        <ProductEditor
          form={form}
          onChange={setForm}
          editing={!!editId}
          busy={busy}
          onSave={save}
          onUploadBusy={setBusy}
          onCancel={() => {
            setEditId(null);
            setForm(emptyProduct);
            setError("");
            setTab("products");
          }}
        />
      )}
      {["products", "orders"].includes(tab) && <>
      <PrimaryButton
        title="Tải lại danh sách"
        variant="secondary"
        disabled={busy}
        onPress={() => load()}
      />
      {items.map((item) =>
        tab === "orders" ? (
          <OrderCard
            key={item.id}
            order={item}
            busy={busy}
            onStatus={(id, status) =>
              confirm("Cập nhật trạng thái đơn hàng?", () =>
                mutate(`/admin/orders/${id}`, "PATCH", { status }),
              )
            }
          />
        ) : (
          <Card key={item.id}>
            <Text style={{ fontWeight: "700", fontSize: 18, lineHeight: 26 }}>
              {item.name}
            </Text>
            <Caption>
              {money(item.price)} · Tồn kho {item.stock} ·{" "}
              {item.isActive ? "Đang bán" : "Ngừng bán"}
            </Caption>
            <PrimaryButton
              title="Chỉnh sửa"
              variant="secondary"
              disabled={busy}
              onPress={() => {
                setSuccess(""); setError("");
                setEditId(item.id);
                setForm({
                  ...item,
                  description: item.description || "",
                  imageUrl: item.imageUrl || "",
                  imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : []),
                  price: String(item.price),
                  stock: String(item.stock),
                });
                setTab("add-product");
                scroll.current?.scrollTo({y:0,animated:true});
              }}
            />
            {!!item.isActive && (
              <PrimaryButton
                title="Xóa khỏi cửa hàng"
                variant="secondary"
                disabled={busy}
                onPress={() =>
                  confirm(
                    "Ngừng bán sản phẩm này? Lịch sử đơn hàng được giữ lại.",
                    () => mutate(`/admin/products/${item.id}`, "DELETE"),
                  )
                }
              />
            )}
          </Card>
        ),
      )}
      {more && (
        <PrimaryButton
          title="Xem thêm"
          disabled={busy}
          onPress={() => load(page + 1)}
        />
      )}
      </>}
    </ScrollView>
  );
}
