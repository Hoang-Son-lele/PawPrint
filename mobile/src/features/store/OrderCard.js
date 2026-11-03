import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow } from "../../theme";
import { formatDate, money } from "../../utils/format";
import StatusBadge from "../../components/StatusBadge";
import Button from "../../components/Button";
import Pressy from "../../components/Pressy";
import Icon from "../../components/Icon";

const NEXT = {
  pending: [
    { status: "confirmed", title: "Xác nhận đơn", icon: "checkmark-circle-outline", variant: "primary" },
    { status: "cancelled", title: "Hủy đơn", icon: "close-circle-outline", variant: "danger" },
  ],
  confirmed: [{ status: "shipping", title: "Bắt đầu giao", icon: "bicycle-outline", variant: "primary" }],
  shipping: [{ status: "delivered", title: "Đã giao", icon: "gift-outline", variant: "accent" }],
};

/** Card đơn hàng cho nhân viên: trạng thái có icon + chữ, hành động theo bước. */
export default function OrderCard({ order, busy, onStatus }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.code}>Đơn #{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.date}>{new Date(order.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>
      <View style={styles.who}>
        <Icon name="person-outline" size={16} color={colors.primary} />
        <Text style={styles.whoText}>
          {order.recipient} · {order.phone}
        </Text>
      </View>
      <View style={styles.who}>
        <Icon name="location-outline" size={16} color={colors.primary} />
        <Text style={[styles.whoText, { fontFamily: fonts.medium }]}>{order.address}</Text>
      </View>
      <View style={styles.items}>
        {order.items.map((item, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.qty}>{item.quantity}×</Text>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>{money(item.price)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.total}>{money(order.total)}</Text>
        <Pressy onPress={() => setOpen(!open)} style={styles.toggle} accessibilityLabel={open ? "Thu gọn thông tin" : "Xem thêm thông tin"}>
          <Text style={styles.toggleText}>{open ? "Thu gọn" : "Chi tiết"}</Text>
          <Icon name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
        </Pressy>
      </View>
      {open && (
        <View style={styles.more}>
          <Text style={styles.moreText}>Mã đơn: {order.id}</Text>
          <Text style={styles.moreText}>Tài khoản: {order.customerEmail}</Text>
          <Text style={styles.moreText}>Ngày đặt: {formatDate(order.createdAt, { weekday: true })}</Text>
          <Text style={styles.moreText}>Thanh toán: {order.paymentMethod === "cod" ? "Khi nhận hàng (COD)" : order.paymentMethod}</Text>
        </View>
      )}
      {!!NEXT[order.status] && (
        <View style={styles.actions}>
          {NEXT[order.status].map((a) => (
            <Button key={a.status} title={a.title} icon={a.icon} variant={a.variant} size="sm" disabled={busy} onPress={() => onStatus(order.id, a.status)} style={{ flex: 1 }} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  code: { fontFamily: fonts.heavy, fontSize: 15.5, color: colors.ink },
  date: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  who: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 4 },
  whoText: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 19, color: colors.ink },
  items: { backgroundColor: colors.backgroundAlt, borderRadius: radius.md, padding: 10, marginTop: 10, gap: 4 },
  item: { flexDirection: "row", gap: 8, alignItems: "center" },
  qty: { fontFamily: fonts.black, fontSize: 13, color: colors.primary, minWidth: 30 },
  itemName: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink },
  itemPrice: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkSoft },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  total: { fontFamily: fonts.black, fontSize: 18, color: colors.primary },
  toggle: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 40, paddingHorizontal: 8 },
  toggleText: { fontFamily: fonts.heavy, fontSize: 13, color: colors.primary },
  more: { gap: 3, paddingTop: 4 },
  moreText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.inkSoft },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
});
