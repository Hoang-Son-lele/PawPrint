import React, { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, Redirect, router } from "expo-router";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { colors, fonts, radius, shadow } from "../../theme";
import { money, normalize } from "../../utils/format";
import WorkHeader from "../../components/WorkHeader";
import { FilterChipRow } from "../../components/FilterChip";
import FormField from "../../components/FormField";
import Button from "../../components/Button";
import SmartImage from "../../components/SmartImage";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { ConfirmSheet } from "../../components/BottomSheet";
import { useToast } from "../../components/Toast";
import Pressy from "../../components/Pressy";
import Icon from "../../components/Icon";
import { stockInfo } from "../../components/ProductCard";
import TrafficPanel from "./TrafficPanel";
import CategoriesPanel from "./CategoriesPanel";
import ProductEditor, { emptyProduct } from "./ProductEditor";
import OrderCard from "./OrderCard";

const TABS = [
  { id: "dashboard", label: "Tổng quan", icon: "speedometer-outline" },
  { id: "products", label: "Sản phẩm", icon: "cube-outline" },
  { id: "add-product", label: "Thêm sản phẩm", icon: "add-circle-outline" },
  { id: "orders", label: "Đơn hàng", icon: "receipt-outline" },
  { id: "categories", label: "Danh mục", icon: "pricetags-outline" },
  { id: "traffic", label: "Thống kê", icon: "stats-chart-outline" },
];

function Stat({ icon, label, value, tone = colors.primary, bg = colors.primarySoft, onPress }) {
  return (
    <Pressy onPress={onPress} disabled={!onPress} scaleTo={0.97} style={[styles.stat, { backgroundColor: bg }]} accessibilityLabel={`${label}: ${value}`}>
      <Icon name={icon} size={20} color={tone} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressy>
  );
}

export default function ManageScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("dashboard");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const [dash, setDash] = useState(null);
  const scroll = useRef(null);

  const load = useCallback(
    async (next = 1, which = tab) => {
      if (!["products", "orders"].includes(which)) return;
      setStatus(next === 1 ? "loading" : "more");
      setError("");
      try {
        const r = await api(`/admin/${which}?page=${next}&limit=50`);
        setItems((old) => (next === 1 ? r.items : [...old, ...r.items]));
        setPage(next);
        setMore(r.hasMore);
        setStatus("ready");
      } catch (e) {
        setError(e.message);
        setStatus("error");
      }
    },
    [tab],
  );

  const loadDash = useCallback(async () => {
    setDash((d) => d || { loading: true });
    try {
      const [traffic, products, orders] = await Promise.all([
        api("/admin/traffic?days=7").catch(() => null),
        api("/admin/products?page=1&limit=100"),
        api("/admin/orders?page=1&limit=100"),
      ]);
      const active = products.items.filter((p) => p.isActive);
      setDash({
        traffic,
        products: products.items.length,
        active: active.length,
        lowStock: active.filter((p) => Number(p.stock) <= 5).sort((a, b) => a.stock - b.stock),
        orders: orders.items,
        pending: orders.items.filter((o) => o.status === "pending"),
        shipping: orders.items.filter((o) => ["confirmed", "shipping"].includes(o.status)).length,
      });
    } catch (e) {
      setDash({ error: e.message });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (tab === "dashboard") loadDash();
      else {
        setItems([]);
        load(1, tab);
      }
    }, [tab]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const switchTab = (next, opts = {}) => {
    setError("");
    setSaveError("");
    setSearch("");
    setFilter(opts.filter || "all");
    if (next === "add-product" && editId) {
      setEditId(null);
      setForm(emptyProduct);
    }
    setTab(next);
  };

  async function save() {
    setBusy(true);
    setSaveError("");
    try {
      if (!form.name?.trim()) throw new Error("Nhập tên sản phẩm.");
      if (!form.category?.trim()) throw new Error("Chọn danh mục sản phẩm.");
      if (!String(form.price).trim() || !String(form.stock).trim()) throw new Error("Nhập giá bán và số lượng tồn kho.");
      if (!(Number(form.price) >= 0) || !Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) throw new Error("Giá và tồn kho phải là số không âm (tồn kho là số nguyên).");
      await api(`/admin/products${editId ? `/${editId}` : ""}`, {
        method: editId ? "PUT" : "POST",
        body: { ...form, price: Number(form.price), stock: Number(form.stock) },
      });
      toast.success(editId ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới");
      setForm(emptyProduct);
      const wasEdit = !!editId;
      setEditId(null);
      if (wasEdit) switchTab("products");
      scroll.current?.scrollTo({ y: 0, animated: true });
    } catch (e) {
      setSaveError(e.message);
      scroll.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setBusy(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      await api(confirm.path, { method: confirm.method, body: confirm.body });
      toast.success(confirm.success);
      setConfirm(null);
      if (tab === "dashboard") loadDash();
      else await load(1);
    } catch (e) {
      setConfirm(null);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const shown = useMemo(() => {
    const q = normalize(search);
    return items.filter((x) => {
      if (tab === "products") {
        if (filter === "active" && !x.isActive) return false;
        if (filter === "inactive" && x.isActive) return false;
        if (filter === "low" && !(x.isActive && Number(x.stock) <= 5)) return false;
        return !q || normalize(`${x.name} ${x.category}`).includes(q);
      }
      if (filter !== "all" && x.status !== filter) return false;
      return !q || normalize(`${x.id} ${x.recipient} ${x.phone} ${x.customerEmail}`).includes(q);
    });
  }, [items, search, filter, tab]);

  if (!["manager", "staff"].includes(user?.role)) return <Redirect href="/" />;

  const editProduct = (item) => {
    setEditId(item.id);
    setForm({
      ...item,
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : []),
      price: String(item.price),
      stock: String(item.stock),
    });
    setSaveError("");
    setTab("add-product");
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <WorkHeader />
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{user?.role === "manager" ? "Điều hành Pet Shop" : "Quầy làm việc Pet Shop"}</Text>
            <Text style={styles.sub}>Sản phẩm, danh mục và đơn hàng của khách.</Text>
          </View>
          <Button title="Xem shop" icon="storefront-outline" size="sm" variant="secondary" onPress={() => router.push("/shop")} />
        </View>
        <FilterChipRow options={TABS.map((t) => (t.id === "add-product" && editId ? { ...t, label: "Sửa sản phẩm", icon: "create-outline" } : t))} value={tab} onChange={(t) => switchTab(t)} style={{ marginVertical: 12 }} />

        {tab === "dashboard" &&
          (!dash || dash.loading ? (
            <LoadingSkeleton variant="grid" count={4} />
          ) : dash.error ? (
            <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được tổng quan" message={dash.error} actionLabel="Thử lại" onAction={loadDash} />
          ) : (
            <>
              <View style={styles.stats}>
                <Stat icon="time-outline" label="Đơn chờ xác nhận" value={dash.pending.length} tone={colors.warning} bg={colors.warningSoft} onPress={() => switchTab("orders", { filter: "pending" })} />
                <Stat icon="bicycle-outline" label="Đang xử lý / giao" value={dash.shipping} tone={colors.lilac} bg={colors.lilacSoft} onPress={() => switchTab("orders")} />
                <Stat icon="cube-outline" label="Sản phẩm đang bán" value={`${dash.active}/${dash.products}`} onPress={() => switchTab("products", { filter: "active" })} />
                <Stat icon="alert-circle-outline" label="Sắp hết / hết hàng" value={dash.lowStock.length} tone={colors.danger} bg={colors.dangerSoft} onPress={() => switchTab("products", { filter: "low" })} />
              </View>
              {dash.traffic && (
                <View style={styles.revenue}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.revenueLabel}>Doanh thu 7 ngày (đơn đã giao)</Text>
                    <Text style={styles.revenueValue}>{money(dash.traffic.sales?.revenue)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.revenueLabel}>Lượt xem shop</Text>
                    <Text style={styles.revenueSmall}>{dash.traffic.shopViews ?? 0}</Text>
                  </View>
                </View>
              )}
              <Text style={styles.section}>Sản phẩm cần chú ý</Text>
              {dash.lowStock.length ? (
                dash.lowStock.slice(0, 6).map((p) => {
                  const s = stockInfo(Number(p.stock));
                  return (
                    <Pressy key={p.id} onPress={() => editProduct(p)} style={styles.rowCard} accessibilityLabel={`${p.name}, ${s.label}. Chỉnh sửa`}>
                      <SmartImage uri={p.imageUrl} style={styles.thumb} fallback="product" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <StatusBadge size="sm" label={s.label} icon={s.icon} fg={s.fg} bg={s.bg} />
                      </View>
                      <Icon name="create-outline" size={18} color={colors.primary} />
                    </Pressy>
                  );
                })
              ) : (
                <EmptyState compact tone="success" icon="checkmark-circle-outline" title="Tồn kho ổn định" message="Không có sản phẩm nào sắp hết hàng." />
              )}
              <Text style={styles.section}>Đơn chờ xác nhận mới nhất</Text>
              {dash.pending.length ? (
                dash.pending.slice(0, 3).map((o) => (
                  <OrderCard key={o.id} order={o} busy={busy} onStatus={(id, s) => setConfirm(orderConfirm(id, s))} />
                ))
              ) : (
                <EmptyState compact tone="success" icon="checkmark-done-outline" title="Không có đơn chờ" message="Tất cả đơn hàng đã được xử lý." />
              )}
            </>
          ))}

        {tab === "traffic" && <TrafficPanel />}
        {tab === "categories" && <CategoriesPanel />}
        {tab === "add-product" && (
          <>
            {!!saveError && (
              <View style={styles.error} accessibilityRole="alert">
                <Icon name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{saveError}</Text>
              </View>
            )}
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
                switchTab("products");
              }}
            />
          </>
        )}

        {["products", "orders"].includes(tab) && (
          <>
            <FormField
              icon="search"
              placeholder={tab === "products" ? "Tìm theo tên hoặc danh mục…" : "Tìm theo mã đơn, người nhận, SĐT, email…"}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Tìm kiếm"
              style={{ marginBottom: 6 }}
            />
            <FilterChipRow
              tone="accent"
              value={filter}
              onChange={setFilter}
              options={
                tab === "products"
                  ? [
                      { id: "all", label: "Tất cả" },
                      { id: "active", label: "Đang bán" },
                      { id: "low", label: "Sắp hết" },
                      { id: "inactive", label: "Ngừng bán" },
                    ]
                  : [
                      { id: "all", label: "Tất cả" },
                      { id: "pending", label: "Chờ xác nhận" },
                      { id: "confirmed", label: "Đã xác nhận" },
                      { id: "shipping", label: "Đang giao" },
                      { id: "delivered", label: "Đã giao" },
                      { id: "cancelled", label: "Đã hủy" },
                    ]
              }
              style={{ marginBottom: 10 }}
            />
            {status === "ready" && (
              <Text style={styles.count} accessibilityLiveRegion="polite">
                Hiển thị {shown.length}/{items.length}
                {more ? "+" : ""} {tab === "products" ? "sản phẩm" : "đơn hàng"}
              </Text>
            )}
            {status === "loading" ? (
              <LoadingSkeleton variant="list" count={4} />
            ) : status === "error" ? (
              <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được danh sách" message={error} actionLabel="Thử lại" onAction={() => load(1)} />
            ) : !shown.length ? (
              <EmptyState compact icon="search" title="Không có kết quả phù hợp" message="Thử từ khóa khác hoặc bỏ bộ lọc." actionLabel="Xóa bộ lọc" onAction={() => { setSearch(""); setFilter("all"); }} />
            ) : tab === "orders" ? (
              shown.map((o) => <OrderCard key={o.id} order={o} busy={busy} onStatus={(id, s) => setConfirm(orderConfirm(id, s))} />)
            ) : (
              shown.map((p) => {
                const s = stockInfo(Number(p.stock));
                return (
                  <View key={p.id} style={styles.product}>
                    <SmartImage uri={p.imageUrl} style={styles.productImg} fallback="product" />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {p.name}
                      </Text>
                      <Text style={styles.meta}>
                        {p.category} · {money(p.price)}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                        <StatusBadge size="sm" label={p.isActive ? "Đang bán" : "Ngừng bán"} icon={p.isActive ? "eye-outline" : "eye-off-outline"} fg={p.isActive ? colors.success : colors.inkSoft} bg={p.isActive ? colors.successSoft : colors.surfaceMuted} />
                        <StatusBadge size="sm" label={`${s.label} · ${p.stock}`} icon={s.icon} fg={s.fg} bg={s.bg} />
                      </View>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                        <Button title="Chỉnh sửa" icon="create-outline" size="sm" variant="secondary" onPress={() => editProduct(p)} disabled={busy} />
                        {!!p.isActive && (
                          <Button
                            title="Ngừng bán"
                            icon="eye-off-outline"
                            size="sm"
                            variant="danger"
                            disabled={busy}
                            onPress={() =>
                              setConfirm({
                                title: `Ngừng bán “${p.name}”?`,
                                message: "Sản phẩm sẽ ẩn khỏi Pet Shop. Lịch sử đơn hàng vẫn được giữ lại và bạn có thể bật bán lại khi chỉnh sửa.",
                                confirmLabel: "Ngừng bán",
                                destructive: true,
                                path: `/admin/products/${p.id}`,
                                method: "DELETE",
                                success: "Đã ngừng bán sản phẩm",
                              })
                            }
                          />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
            {more && status !== "loading" && <Button title="Tải thêm" variant="outline" icon="chevron-down" loading={status === "more"} onPress={() => load(page + 1)} full style={{ marginTop: 8 }} />}
          </>
        )}
      </ScrollView>
      <ConfirmSheet
        visible={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={busy}
        destructive={confirm?.destructive}
        icon={confirm?.icon}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel="Hủy"
      />
    </View>
  );
}

const ORDER_ACTIONS = {
  confirmed: { title: "Xác nhận đơn hàng?", message: "Khách sẽ thấy đơn chuyển sang “Đã xác nhận”. Hãy chắc chắn đã gọi xác nhận phí và lịch giao.", label: "Xác nhận đơn", icon: "checkmark-circle-outline" },
  shipping: { title: "Bắt đầu giao hàng?", message: "Đơn sẽ chuyển sang “Đang giao”.", label: "Bắt đầu giao", icon: "bicycle-outline" },
  delivered: { title: "Xác nhận đã giao?", message: "Đơn sẽ hoàn tất và được tính vào doanh thu.", label: "Đã giao thành công", icon: "gift-outline" },
  cancelled: { title: "Hủy đơn hàng này?", message: "Đơn sẽ bị hủy và số lượng sản phẩm được hoàn lại tồn kho. Không thể hoàn tác.", label: "Hủy đơn", icon: "close-circle-outline", destructive: true },
};
function orderConfirm(id, status) {
  const a = ORDER_ACTIONS[status];
  return { title: a.title, message: a.message, confirmLabel: a.label, icon: a.icon, destructive: a.destructive, path: `/admin/orders/${id}`, method: "PATCH", body: { status }, success: "Đã cập nhật trạng thái đơn" };
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 60, maxWidth: 980, width: "100%", alignSelf: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontFamily: fonts.black, fontSize: 22, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.inkSoft, marginTop: 2 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { flexBasis: "46%", flexGrow: 1, borderRadius: radius.lg, padding: 14, minHeight: 100 },
  statValue: { fontFamily: fonts.black, fontSize: 24, color: colors.ink, marginTop: 6 },
  statLabel: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.inkSoft },
  revenue: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, padding: 16, marginTop: 12, ...shadow.soft },
  revenueLabel: { fontFamily: fonts.bold, fontSize: 12, color: "#C5D7F3" },
  revenueValue: { fontFamily: fonts.black, fontSize: 22, color: colors.white, marginTop: 2 },
  revenueSmall: { fontFamily: fonts.black, fontSize: 18, color: colors.accent, marginTop: 2 },
  section: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink, marginTop: 22, marginBottom: 10 },
  rowCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border, minHeight: 64 },
  thumb: { width: 48, height: 48, borderRadius: 12 },
  rowTitle: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkSoft },
  count: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkSoft, marginBottom: 8 },
  product: { flexDirection: "row", gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  productImg: { width: 84, height: 84, borderRadius: radius.md },
  error: { flexDirection: "row", gap: 8, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 12, marginBottom: 10 },
  errorText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.danger },
});
