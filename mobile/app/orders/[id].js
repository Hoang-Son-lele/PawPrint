import React, { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../src/services/api";
import {
  Title,
  Caption,
  Card,
  PrimaryButton,
  ErrorText,
} from "../../src/components/UI";
import { money } from "../../src/utils/format";
import { statuses } from "../../src/utils/format";
export default function Order() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState(null),
    [error, setError] = useState("");
  const load = () =>
    api(`/shop/orders/${id}`)
      .then((r) => setOrder(r.order))
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [id]);
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
      <Title>Chi tiết đơn hàng</Title>
      <ErrorText error={error} />
      <PrimaryButton title="Tải lại" onPress={load} />
      {order && (
        <>
          <Caption>Mã đơn: {order.id}</Caption>
          <Card>
            <Text>{statuses[order.status] || order.status} · COD</Text>
            <Text>
              {order.recipient} · {order.phone}
            </Text>
            <Caption>{order.address}</Caption>
          </Card>
          {order.items.map((p, i) => (
            <Card key={i}>
              <Text>{p.name}</Text>
              <Caption>
                {p.quantity} × {money(p.price)}
              </Caption>
            </Card>
          ))}
          <Title>{money(order.total)}</Title>
          <Caption>
            Tiền hàng, chưa bao gồm phí giao hàng. Cửa hàng sẽ liên hệ xác nhận.
          </Caption>
        </>
      )}
    </ScrollView>
  );
}
