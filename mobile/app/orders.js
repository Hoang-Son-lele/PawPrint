import React, { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "../src/services/api";
import {
  Title,
  Caption,
  Card,
  PrimaryButton,
  ErrorText,
} from "../src/components/UI";
import { money } from "../src/utils/format";
export const statuses = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};
export default function Orders() {
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false);
  async function load(next = 1) {
    setBusy(true);
    setError("");
    try {
      const r = await api(`/shop/orders?page=${next}`);
      setItems((old) => (next === 1 ? r.items : [...old, ...r.items]));
      setMore(r.hasMore);
      setPage(next);
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
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
      <Title>Đơn hàng của tôi</Title>
      <ErrorText error={error} />
      <PrimaryButton title="Tải lại" disabled={busy} onPress={() => load()} />
      {!busy && !items.length && <Caption>Bạn chưa có đơn hàng.</Caption>}
      {items.map((o) => (
        <Card key={o.id}>
          <Caption>
            {String(o.createdAt).slice(0, 10)} ·{" "}
            {statuses[o.status] || o.status}
          </Caption>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>
            {money(o.total)}
          </Text>
          <PrimaryButton
            title="Xem đơn hàng"
            variant="secondary"
            onPress={() => router.push(`/orders/${o.id}`)}
          />
        </Card>
      ))}
      {more && (
        <PrimaryButton
          title="Xem thêm"
          disabled={busy}
          onPress={() => load(page + 1)}
        />
      )}
    </ScrollView>
  );
}
