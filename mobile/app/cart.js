import React, { useCallback, useRef, useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { api } from "../src/services/api";
import {
  Title,
  Caption,
  Card,
  TextField,
  PrimaryButton,
  ErrorText,
} from "../src/components/UI";
import { money } from "../src/utils/format";
export default function Cart() {
  const [cart, setCart] = useState({ items: [], total: 0 }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [recipient, setRecipient] = useState(""),
    [phone, setPhone] = useState(""),
    [address, setAddress] = useState("");
  const key = useRef(null);
  async function load() {
    setBusy(true);
    setError("");
    try {
      setCart(await api("/shop/cart"));
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
  async function change(id, quantity) {
    setBusy(true);
    setError("");
    try {
      await api(
        `/shop/cart/${id}`,
        quantity ? { method: "PUT", body: { quantity } } : { method: "DELETE" },
      );
      key.current = null;
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      if (!key.current)
        key.current = (await api("/shop/checkout-key")).requestKey;
      const r = await api("/shop/orders", {
        method: "POST",
        body: { requestKey: key.current, recipient, phone, address },
      });
      key.current = null;
      router.replace(`/orders/${r.order.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
      <Title>Giỏ hàng</Title>
      <ErrorText error={error} />
      <PrimaryButton
        title="Tải lại giỏ"
        variant="secondary"
        disabled={busy}
        onPress={load}
      />
      {!cart.items.length && <Caption>Giỏ hàng đang trống.</Caption>}
      {cart.items.map((p) => (
        <Card key={p.id}>
          <Text style={{ fontWeight: "700", fontSize: 17 }}>{p.name}</Text>
          <Caption>
            {money(p.price)} × {p.quantity} · Tồn kho {p.stock}
          </Caption>
          <PrimaryButton
            title="+ Tăng"
            disabled={busy || p.quantity >= Math.min(99, p.stock)}
            onPress={() => change(p.id, p.quantity + 1)}
          />
          <PrimaryButton
            title="− Giảm"
            variant="secondary"
            disabled={busy || p.quantity <= 1}
            onPress={() => change(p.id, p.quantity - 1)}
          />
          <PrimaryButton
            title="Xóa khỏi giỏ"
            variant="secondary"
            disabled={busy}
            onPress={() => change(p.id, 0)}
          />
        </Card>
      ))}
      {!!cart.items.length && (
        <Card>
          <Title>{money(cart.total)}</Title>
          <Caption>
            Thanh toán khi nhận hàng (COD). Chưa tính phí giao hàng; cửa hàng sẽ
            liên hệ xác nhận phí và lịch giao trước khi gửi.
          </Caption>
          <TextField
            label="Người nhận"
            value={recipient}
            onChangeText={(v) => {
              key.current = null;
              setRecipient(v);
            }}
          />
          <TextField
            label="Số điện thoại"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(v) => {
              key.current = null;
              setPhone(v);
            }}
          />
          <TextField
            label="Địa chỉ giao hàng"
            multiline
            value={address}
            onChangeText={(v) => {
              key.current = null;
              setAddress(v);
            }}
          />
          <PrimaryButton
            title="Đặt hàng COD"
            loading={busy}
            disabled={!recipient.trim() || !phone.trim() || !address.trim()}
            onPress={checkout}
          />
        </Card>
      )}
    </ScrollView>
  );
}
