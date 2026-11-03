import React, { useState } from "react";
import { Text } from "react-native";
import { Card, Caption, PrimaryButton } from "../../components/UI";
import { money, statuses } from "../../utils/format";
export default function OrderCard({ order, busy, onStatus }) {
  const [details, setDetails] = useState(false);
  return (
    <Card>
      <Caption>
        Đơn #{order.id.slice(0, 8).toUpperCase()} · {statuses[order.status]}
      </Caption>
      <Text style={{ fontWeight: "700", fontSize: 18, lineHeight: 27 }}>
        {order.recipient}
      </Text>
      <Caption>
        {order.phone} · {order.address}
      </Caption>
      <PrimaryButton title={details ? "Thu gọn thông tin đơn" : "Xem thông tin đơn hàng"} variant="secondary" onPress={() => setDetails(!details)} />
      {details && <>
        <Caption>Mã đơn: {order.id}</Caption>
        <Caption>Tài khoản đặt hàng: {order.customerEmail}</Caption>
        <Caption>Ngày đặt: {new Date(order.createdAt).toLocaleString("vi-VN", {timeZone:"Asia/Ho_Chi_Minh"})}</Caption>
        <Caption>Thanh toán: {order.paymentMethod === "cod" ? "Khi nhận hàng (COD)" : order.paymentMethod}</Caption>
      </>}
      {order.items.map((item, i) => (
        <Text key={i} style={{ fontSize: 15, lineHeight: 24, marginTop: 8 }}>
          {item.name} × {item.quantity} · {money(item.price)}
        </Text>
      ))}
      <Text
        style={{
          fontWeight: "700",
          fontSize: 20,
          lineHeight: 30,
          marginTop: 12,
        }}
      >
        {money(order.total)}
      </Text>
      {order.status === "pending" && (
        <>
          <PrimaryButton
            title="Xác nhận đơn"
            disabled={busy}
            onPress={() => onStatus(order.id, "confirmed")}
          />
          <PrimaryButton
            title="Hủy đơn · Hoàn tồn kho"
            variant="secondary"
            disabled={busy}
            onPress={() => onStatus(order.id, "cancelled")}
          />
        </>
      )}
      {order.status === "confirmed" && (
        <PrimaryButton
          title="Bắt đầu giao hàng"
          disabled={busy}
          onPress={() => onStatus(order.id, "shipping")}
        />
      )}
      {order.status === "shipping" && (
        <PrimaryButton
          title="Xác nhận đã giao"
          disabled={busy}
          onPress={() => onStatus(order.id, "delivered")}
        />
      )}
    </Card>
  );
}
