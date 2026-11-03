import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { trackView } from "../../services/traffic";
import { colors, fonts, radius, shadow } from "../../theme";
import Screen from "../../components/Screen";
import ScreenHeader from "../../components/ScreenHeader";
import { FilterChipRow } from "../../components/FilterChip";
import ProductCard, { isLivePetCategory } from "../../components/ProductCard";
import EmptyState from "../../components/EmptyState";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import Button, { IconButton } from "../../components/Button";
import Pressy from "../../components/Pressy";
import FadeIn from "../../components/FadeIn";
import Icon from "../../components/Icon";
import { CatFace, DogFace, Paw, Sparkle } from "../../components/Decor";
import { cartStore, useCartCount } from "./cartStore";

export default function ShopScreen() {
  const { user } = useAuth();
  const employee = ["manager", "staff"].includes(user?.role);
  const { width } = useWindowDimensions();
  const cartCount = useCartCount();
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const generation = useRef(0);
  const inputRef = useRef(null);

  const cols = width >= 1000 ? 4 : width >= 680 ? 3 : 2;
  const gridW = Math.min(width, 1100) - 36;
  const cardW = (gridW - (cols - 1) * 12) / cols;

  const load = useCallback(
    async (next = 1) => {
      const g = ++generation.current;
      if (next === 1) setStatus((s) => (s === "ready" ? "updating" : "loading"));
      else setLoadingMore(true);
      setError("");
      try {
        const r = await api("/shop/products/search", { method: "POST", body: { search: query, category, page: next, limit: 20 } });
        if (g !== generation.current) return;
        setItems((old) => (next === 1 ? r.items : [...old, ...r.items]));
        setPage(next);
        setMore(r.hasMore);
        setStatus("ready");
      } catch (e) {
        if (g !== generation.current) return;
        setError(e.message);
        setStatus(next === 1 ? "error" : "ready");
      } finally {
        if (g === generation.current) setLoadingMore(false);
      }
    },
    [query, category],
  );

  // Cập nhật kết quả ngay khi đổi danh mục / từ khóa (tìm kiếm có độ trễ nhẹ khi gõ).
  useEffect(() => {
    load(1);
  }, [load]);
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 380);
    return () => clearTimeout(t);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      if (!employee) {
        trackView();
        cartStore.refresh();
      }
      api("/shop/categories")
        .then((r) => setCategories(r.items))
        .catch(() => {});
    }, [employee]),
  );

  const clearAll = () => {
    setSearch("");
    setQuery("");
    setCategory("");
  };
  const live = isLivePetCategory(category);
  const filtered = !!query || !!category;

  const header = (
    <ScreenHeader
      back={employee}
      title="Pet Shop"
      subtitle="Dành cho người bạn nhỏ"
      right={
        employee ? (
          <Button title="Quản lý" icon="briefcase-outline" size="sm" variant="secondary" onPress={() => router.replace("/manage")} />
        ) : (
          <>
            <IconButton icon="receipt-outline" label="Đơn hàng của tôi" onPress={() => router.push("/orders")} variant="outline" />
            <IconButton icon="bag-handle" label={`Giỏ hàng, ${cartCount} sản phẩm`} onPress={() => router.push("/cart")} variant="primary" badge={cartCount} />
          </>
        )
      }
    />
  );

  return (
    <Screen
      header={header}
      wide
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load(1);
        setRefreshing(false);
      }}
      bottomInset={employee ? 40 : 120}
    >
      {/* ---------- Hero ---------- */}
      <FadeIn style={styles.hero}>
        <Paw size={80} color="#FFFFFF" opacity={0.06} rotate={-16} style={{ position: "absolute", left: -12, bottom: -14 }} />
        <Sparkle size={14} style={{ position: "absolute", left: "48%", top: 18 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroOver}>Góc nhỏ cho bé</Text>
          <Text style={styles.heroTitle}>Yêu thương bé từ những điều nhỏ xinh</Text>
          <Text style={styles.heroText}>Thức ăn, phụ kiện, đồ chăm sóc được chọn lọc cho bé.</Text>
        </View>
        <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <DogFace size={68} />
          <View style={{ marginTop: -18, marginLeft: 26 }}>
            <CatFace size={58} />
          </View>
        </View>
      </FadeIn>

      {/* ---------- Tìm kiếm ---------- */}
      <View style={styles.search}>
        <Icon name="search" size={20} color={colors.primary} />
        <TextInput
          ref={inputRef}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setQuery(search.trim())}
          placeholder="Tìm theo tên hoặc danh mục…"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={styles.searchInput}
          accessibilityLabel="Tìm sản phẩm"
          accessibilityHint="Hỗ trợ tìm có dấu và không dấu"
        />
        {status === "updating" && <Text style={styles.searching}>Đang tìm…</Text>}
        {!!search && (
          <Pressy onPress={() => { setSearch(""); setQuery(""); inputRef.current?.focus(); }} accessibilityLabel="Xóa từ khóa" style={styles.clear} hitSlop={6}>
            <Icon name="close" size={16} color={colors.white} />
          </Pressy>
        )}
      </View>

      <FilterChipRow
        options={[{ id: "", label: "Tất cả", icon: "apps-outline" }, ...categories.map((c) => ({ id: c.name, label: c.name }))]}
        value={category}
        onChange={setCategory}
        style={{ marginVertical: 12 }}
      />

      {live && (
        <View style={styles.notice} accessibilityRole="text">
          <Icon name="information-circle" size={20} color={colors.info} />
          <Text style={styles.noticeText}>Mục này chỉ mang tính tham khảo. Vui lòng liên hệ cửa hàng để xác thực thông tin, nguồn gốc và tình trạng sức khỏe trước khi quyết định.</Text>
        </View>
      )}

      {(status === "ready" || status === "updating") && (
        <View style={styles.resultRow}>
          <Text style={styles.result} accessibilityLiveRegion="polite">
            {items.length ? `Tìm thấy ${items.length}${more ? "+" : ""} sản phẩm` : "Không có sản phẩm phù hợp"}
            {query ? ` cho “${query}”` : ""}
            {category ? ` trong ${category}` : ""}
          </Text>
          {filtered && (
            <Pressy onPress={clearAll} accessibilityLabel="Xóa bộ lọc" style={styles.clearFilters}>
              <Text style={styles.clearFiltersText}>Xóa lọc</Text>
            </Pressy>
          )}
        </View>
      )}

      {status === "loading" ? (
        <LoadingSkeleton variant="grid" count={4} />
      ) : status === "error" ? (
        <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được cửa hàng" message={error} actionLabel="Thử lại" onAction={() => load(1)} />
      ) : !items.length ? (
        <EmptyState
          icon="search"
          title="Chưa tìm thấy món phù hợp"
          message={filtered ? "Thử từ khóa ngắn hơn, viết không dấu, hoặc chọn danh mục khác nhé." : "Cửa hàng đang cập nhật sản phẩm mới, bạn quay lại sau nhé."}
          actionLabel={filtered ? "Xóa bộ lọc" : undefined}
          actionIcon="close-circle-outline"
          onAction={clearAll}
        />
      ) : (
        <View style={[styles.grid, status === "updating" && { opacity: 0.6 }]}>
          {items.map((p, i) => (
            <FadeIn key={p.id} index={i % 8} trigger={`${query}|${category}`}>
              <ProductCard product={p} width={cardW} onPress={() => router.push(`/products/${p.id}`)} />
            </FadeIn>
          ))}
        </View>
      )}
      {more && status === "ready" && (
        <Button title="Xem thêm sản phẩm" variant="outline" icon="chevron-down" onPress={() => load(page + 1)} loading={loadingMore} style={{ marginTop: 16 }} full />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.xl, padding: 20, overflow: "hidden", ...shadow.soft },
  heroOver: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", color: colors.accent },
  heroTitle: { fontFamily: fonts.black, fontSize: 21, lineHeight: 28, color: colors.white, marginTop: 6 },
  heroText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: "#CFE0F7", marginTop: 6 },
  heroArt: { marginLeft: 6 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 54,
    marginTop: 14,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryTint,
    ...shadow.soft,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, paddingVertical: 12, ...(Platform.OS === "web" ? { outlineStyle: "none" } : null) },
  searching: { fontFamily: fonts.bold, fontSize: 12, color: colors.inkSoft },
  clear: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" },
  notice: { flexDirection: "row", gap: 10, backgroundColor: colors.infoSoft, borderRadius: radius.md, padding: 14, marginBottom: 12 },
  noticeText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 19, color: colors.ink },
  resultRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10 },
  result: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5, color: colors.inkSoft },
  clearFilters: { minHeight: 36, justifyContent: "center", paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.accentSoft },
  clearFiltersText: { fontFamily: fonts.heavy, fontSize: 12.5, color: colors.accentDark },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
