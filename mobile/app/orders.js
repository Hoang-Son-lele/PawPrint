import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "../src/services/api";
import { colors, fonts, radius, shadow } from "../src/theme";
import { formatDate, money } from "../src/utils/format";
import Screen from "../src/components/Screen";
import ScreenHeader from "../src/components/ScreenHeader";
import { FilterChipRow } from "../src/components/FilterChip";
import StatusBadge, { ORDER_STATUS } from "../src/components/StatusBadge";
import EmptyState from "../src/components/EmptyState";
import LoadingSkeleton from "../src/components/LoadingSkeleton";
import Button from "../src/components/Button";
import Pressy from "../src/components/Pressy";
import FadeIn from "../src/components/FadeIn";
import Icon from "../src/components/Icon";

export { ORDER_STATUS as statuses };

export default function Orders() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (next = 1) => {
    if (next > 1) setLoadingMore(true);
    setError("");
    try {
      const r = await api(`/shop/orders?page=${next}`);
      setItems((old) => (next === 1 ? r.items : [...old, ...r.items]));
      setMore(r.hasMore);
      setPage(next);
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus((s) => (s === "ready" ? s : "error"));
    } finally {
      setLoadingMore(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load]),
  );

  const counts = useMemo(() => items.reduce((acc, o) => ({ ...acc, [o.status]: (acc[o.status] || 0) + 1 }), {}), [items]);
  const shown = filter === "all" ? items : items.filter((o) => o.status === filter);
  const options = [{ id: "all", label: "Tất cả", count: items.length }, ...Object.entries(ORDER_STATUS).filter(([k]) => counts[k]).map(([k, v]) => ({ id: k, label: v.label, count: counts[k] }))];

  return (
    <Screen
      header={<ScreenHeader title="Đơn hàng của tôi" />}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load(1);
        setRefreshing(false);
      }}
      bottomInset={50}
    >
      {status === "loading" ? (
        <LoadingSkeleton variant="list" count={4} />
      ) : status === "error" ? (
        <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được đơn hàng" message={error} actionLabel="Thử lại" onAction={() => load(1)} />
      ) : !items.length ? (
        <EmptyState emoji="📦" title="Bạn chưa có đơn hàng nào" message="Khi bạn đặt hàng ở Pet Shop, đơn sẽ xuất hiện tại đây để theo dõi." actionLabel="Ghé Pet Shop" actionIcon="storefront" onAction={() => router.replace("/shop")} />
      ) : (
        <>
          <FilterChipRow options={options} value={filter} onChange={setFilter} style={{ marginBottom: 12 }} />
          {shown.map((o, i) => (
            <FadeIn key={o.id} index={i} trigger={filter}>
              <Pressy onPress={() => router.push(`/orders/${o.id}`)} scaleTo={0.98} style={styles.card} accessibilityLabel={`Đơn ${o.id.slice(0, 8)}, ${formatDate(o.createdAt)}, ${money(o.total)}, ${ORDER_STATUS[o.status]?.label}. Xem chi tiết`}>
                <View style={styles.icon}>
                  <Icon name="receipt" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.code}>Đơn #{o.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.date}>{formatDate(o.createdAt, { weekday: true })}</Text>
                  <StatusBadge status={o.status} size="sm" />
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={styles.total}>{money(o.total)}</Text>
                  <View style={styles.more}>
                    <Text style={styles.moreText}>Chi tiết</Text>
                    <Icon name="chevron-forward" size={14} color={colors.primary} />
                  </View>
                </View>
              </Pressy>
            </FadeIn>
          ))}
          {!shown.length && <EmptyState compact icon="filter" title="Không có đơn ở trạng thái này" actionLabel="Xem tất cả" onAction={() => setFilter("all")} />}
          {more && <Button title="Xem thêm đơn hàng" variant="outline" icon="chevron-down" loading={loadingMore} onPress={() => load(page + 1)} full style={{ marginTop: 8 }} />}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  icon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  code: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  date: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.inkSoft },
  total: { fontFamily: fonts.black, fontSize: 16, color: colors.primary },
  more: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 32 },
  moreText: { fontFamily: fonts.heavy, fontSize: 12.5, color: colors.primary },
});
