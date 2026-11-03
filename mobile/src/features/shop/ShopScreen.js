import React, { useCallback, useRef, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "../../services/api";
import {
  Title,
  Caption,
  TextField,
  PrimaryButton,
  ErrorText,
} from "../../components/UI";
import ChoiceChips from "../../components/ChoiceChips";
import ProductCard from "./ProductCard";
import { palette, typography } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { trackView } from "../../services/traffic";
export default function ShopScreen() {
  const { user } = useAuth();
  const employee = ["manager", "staff"].includes(user?.role);
  useFocusEffect(useCallback(() => { if (!employee) trackView(); }, [employee]));
  const [gridWidth, setGridWidth] = useState(0);
  const columns = gridWidth >= 900 ? 3 : gridWidth >= 550 ? 2 : 1;
  const [items, setItems] = useState([]),
    [categories, setCategories] = useState([]),
    [category, setCategory] = useState(""),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false);
  const generation = useRef(0);
  const load = useCallback(
    async (next = 1) => {
      const current = ++generation.current;
      setBusy(true);
      setError("");
      try {
        const r = await api(
          `/shop/products?search=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&page=${next}`,
        );
        if (current === generation.current) {
          setItems((old) => (next === 1 ? r.items : [...old, ...r.items]));
          setPage(next);
          setMore(r.hasMore);
        }
      } catch (e) {
        if (current === generation.current) setError(e.message);
      } finally {
        if (current === generation.current) setBusy(false);
      }
    },
    [category, query],
  );
  useFocusEffect(
    useCallback(() => {
      load();
      api("/shop/categories")
        .then((r) => setCategories(r.items))
        .catch((e) => setError(e.message));
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.body}
      refreshControl={
        <RefreshControl refreshing={busy} onRefresh={() => load()} />
      }
    >
      <Text style={s.eyebrow}>DÀNH CHO NGƯỜI BẠN NHỎ</Text>
      <Title>Pet Shop</Title>
      <Caption>Những món đồ nhỏ, thêm niềm vui cho bé.</Caption>
      <View style={s.actions}>
        {employee ? <PrimaryButton title="Về quản lý cửa hàng" onPress={() => router.push("/manage")} /> : <>
        <PrimaryButton title="Giỏ hàng" onPress={() => router.push("/cart")} />
        <PrimaryButton
          title="Đơn hàng của tôi"
          variant="secondary"
          onPress={() => router.push("/orders")}
        />
        </>}
      </View>
      <View style={s.search}>
        <TextField
          label="Bạn đang tìm gì cho bé?"
          placeholder="Thức ăn, đồ chơi, phụ kiện…"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => {
            if (query === search.trim()) load();
            else setQuery(search.trim());
          }}
        />
        <PrimaryButton
          title="Tìm sản phẩm"
          disabled={busy}
          onPress={() => {
            if (query === search.trim()) load();
            else setQuery(search.trim());
          }}
        />
      </View>
      <ChoiceChips
        options={[
          { id: "", label: "Tất cả" },
          ...categories.map((c) => ({ id: c.name, label: c.name })),
        ]}
        value={category}
        onChange={setCategory}
        disabled={busy}
      />
      <ErrorText error={error} />
      {!busy && !items.length && (
        <View style={s.empty}>
          <Text style={{ fontSize: 40 }}>🛍️</Text>
          <Text style={s.emptyTitle}>Chưa tìm thấy sản phẩm</Text>
          <Caption>Thử từ khóa hoặc danh mục khác nhé.</Caption>
        </View>
      )}
      <View
        style={s.grid}
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
      >
        {items.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            width={
              gridWidth ? (gridWidth - 16 * (columns - 1)) / columns : "100%"
            }
            onPress={() => router.push(`/products/${p.id}`)}
          />
        ))}
      </View>
      {more && (
        <PrimaryButton
          title="Xem thêm sản phẩm"
          disabled={busy}
          onPress={() => load(page + 1)}
        />
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { backgroundColor: palette.background },
  body: {
    padding: 22,
    paddingBottom: 60,
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center",
  },
  eyebrow: {
    ...typography.heading,
    color: palette.primary,
    fontSize: 11,
    letterSpacing: 1.3,
    lineHeight: 20,
    marginBottom: 10,
  },
  actions: { flexDirection: "row", gap: 12, marginVertical: 12 },
  search: {
    backgroundColor: palette.surface,
    padding: 18,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  empty: {
    alignItems: "center",
    padding: 32,
    backgroundColor: palette.surface,
    borderRadius: 20,
  },
  emptyTitle: {
    ...typography.heading,
    fontSize: 18,
    lineHeight: 28,
    marginTop: 14,
    color: palette.ink,
  },
});
