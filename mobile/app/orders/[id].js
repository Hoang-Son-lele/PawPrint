import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../src/services/api";
import { colors, fonts, radius, shadow } from "../../src/theme";
import { formatDate, money } from "../../src/utils/format";
import Screen from "../../src/components/Screen";
import ScreenHeader from "../../src/components/ScreenHeader";
import StatusBadge, { ORDER_STATUS } from "../../src/components/StatusBadge";
import EmptyState from "../../src/components/EmptyState";
import LoadingSkeleton from "../../src/components/LoadingSkeleton";
import Button from "../../src/components/Button";
import FadeIn from "../../src/components/FadeIn";
import Icon from "../../src/components/Icon";
import { PawBurst } from "../../src/components/Decor";

const FLOW = ["pending", "confirmed", "shipping", "delivered"];

export default function Order() {
  const { id, placed } = useLocalSearchParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await api(`/shop/orders/${id}`);
      setOrder(r.order);
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus(e.status === 404 ? "missing" : "error");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const step = order ? FLOW.indexOf(order.status) : -1;
  const back = () => router.replace("/orders");

  return (
    <Screen
      header={<ScreenHeader title={order ? `Đơn #${order.id.slice(0, 8).toUpperCase()}` : "Chi tiết đơn hàng"} onBack={placed ? back : undefined} />}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      bottomInset={50}
    >
      {status === "loading" ? (
        <LoadingSkeleton variant="list" count={3} />
      ) : status !== "ready" ? (
        <EmptyState tone="error" icon={status === "missing" ? "search" : "cloud-offline-outline"} title={status === "missing" ? "Không tìm thấy đơn hàng" : "Chưa tải được đơn hàng"} message={error} actionLabel={status === "missing" ? "Về danh sách đơn" : "Thử lại"} onAction={status === "missing" ? back : load} />
      ) : (
        <>
          {placed === "1" && (
            <FadeIn from="scale" style={styles.placed}>
              <PawBurst play={order.id} radius={110} size={14} />
              <Icon name="checkmark-circle" size={40} color={colors.accent} />
              <Text style={styles.placedTitle}>Đặt hàng thành công!</Text>
              <Text style={styles.placedText}>Cảm ơn bạn đã mua sắm cho bé. Cửa hàng sẽ gọi xác nhận phí giao hàng và lịch giao trong thời gian sớm nhất.</Text>
            </FadeIn>
          )}

          <View style={styles.card}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Ngày đặt</Text>
                <Text style={styles.value}>{formatDate(order.createdAt, { weekday: true })}</Text>
              </View>
              <StatusBadge status={order.status} />
            </View>
            {order.status === "cancelled" ? (
              <View style={styles.cancel}>
                <Icon name="close-circle" size={20} color={colors.danger} />
                <Text style={styles.cancelText}>Đơn hàng đã được hủy. Nếu cần hỗ trợ, vui lòng liên hệ cửa hàng.</Text>
              </View>
            ) : (
              <View style={styles.track} accessibilityLabel={`Tiến trình: ${ORDER_STATUS[order.status]?.label}`}>
                {FLOW.map((s, i) => {
                  const done = i <= step;
                  const meta = ORDER_STATUS[s];
                  return (
                    <View key={s} style={styles.trackStep}>
                      <View style={styles.trackRow}>
                        {i > 0 && <View style={[styles.trackLine, i <= step && { backgroundColor: colors.accent }]} />}
                        <View style={[styles.trackDot, done && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                          <Icon name={done ? "checkmark" : meta.icon} size={14} color={done ? colors.primaryDark : colors.muted} />
                        </View>
                        {i < FLOW.length - 1 && <View style={[styles.trackLine, i < step && { backgroundColor: colors.accent }]} />}
                      </View>
                      <Text style={[styles.trackLabel, i === step && { color: colors.primary, fontFamily: fonts.black }]}>{meta.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Thông tin giao hàng</Text>
            {[
              ["person-outline", order.recipient],
              ["call-outline", order.phone],
              ["location-outline", order.address],
              ["cash-outline", order.paymentMethod === "cod" ? "Thanh toán khi nhận hàng (COD)" : order.paymentMethod],
            ].map(([icon, text]) => (
              <View key={icon} style={styles.infoRow}>
                <Icon name={icon} size={18} color={colors.primary} />
                <Text style={styles.infoText}>{text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sản phẩm</Text>
            {order.items.map((p, i) => (
              <View key={i} style={styles.line}>
                <View style={styles.qty}>
                  <Text style={styles.qtyText}>{p.quantity}×</Text>
                </View>
                <Text style={styles.lineName}>{p.name}</Text>
                <Text style={styles.linePrice}>{money(Number(p.price) * p.quantity)}</Text>
              </View>
            ))}
            <View style={styles.sum}>
              <Text style={styles.sumLabel}>Tổng tiền hàng</Text>
              <Text style={styles.sumValue}>{money(order.total)}</Text>
            </View>
            <Text style={styles.note}>Chưa bao gồm phí giao hàng. Cửa hàng sẽ liên hệ xác nhận.</Text>
          </View>
          <Button title="Tiếp tục mua sắm" icon="storefront-outline" variant="secondary" onPress={() => router.replace("/shop")} full />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  placed: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.xl, padding: 22, marginBottom: 14, overflow: "hidden", ...shadow.lifted },
  placedTitle: { fontFamily: fonts.black, fontSize: 22, color: colors.white, marginTop: 8 },
  placedText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: "#D3E2F8", textAlign: "center", marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.inkSoft },
  value: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink, marginTop: 2 },
  cancel: { flexDirection: "row", gap: 10, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 12, marginTop: 14 },
  cancelText: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 19, color: colors.ink },
  track: { flexDirection: "row", marginTop: 18 },
  trackStep: { flex: 1, alignItems: "center" },
  trackRow: { flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "center" },
  trackLine: { flex: 1, height: 3, backgroundColor: colors.border },
  trackDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  trackLabel: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.inkSoft, marginTop: 6, textAlign: "center" },
  cardTitle: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink, marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 6 },
  infoText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.ink },
  line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  qty: { minWidth: 38, height: 30, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  qtyText: { fontFamily: fonts.black, fontSize: 13, color: colors.primary },
  lineName: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  linePrice: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink },
  sum: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 6 },
  sumLabel: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  sumValue: { fontFamily: fonts.black, fontSize: 18, color: colors.primary },
  note: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, marginTop: 6 },
});
