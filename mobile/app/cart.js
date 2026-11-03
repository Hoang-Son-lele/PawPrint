import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/services/api";
import { colors, fonts, radius, shadow } from "../src/theme";
import { money } from "../src/utils/format";
import Screen from "../src/components/Screen";
import ScreenHeader from "../src/components/ScreenHeader";
import SmartImage from "../src/components/SmartImage";
import Stepper from "../src/components/Stepper";
import Button, { IconButton } from "../src/components/Button";
import EmptyState from "../src/components/EmptyState";
import LoadingSkeleton from "../src/components/LoadingSkeleton";
import { ConfirmSheet } from "../src/components/BottomSheet";
import FadeIn from "../src/components/FadeIn";
import Pressy from "../src/components/Pressy";
import Icon from "../src/components/Icon";
import { useToast } from "../src/components/Toast";
import { cartStore } from "../src/features/shop/cartStore";

export default function Cart() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState({});
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const timers = useRef({});
  const confirmed = useRef({});

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await api("/shop/cart");
      setItems(r.items);
      cartStore.set(r.items);
      r.items.forEach((x) => (confirmed.current[x.id] = x.quantity));
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus((s) => (s === "ready" ? s : "error"));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function changeQty(item, quantity) {
    setItems((list) => {
      const next = list.map((x) => (x.id === item.id ? { ...x, quantity } : x));
      cartStore.set(next);
      return next;
    });
    setSyncing((s) => ({ ...s, [item.id]: true }));
    clearTimeout(timers.current[item.id]);
    timers.current[item.id] = setTimeout(async () => {
      try {
        await api(`/shop/cart/${item.id}`, { method: "PUT", body: { quantity } });
        confirmed.current[item.id] = quantity;
      } catch (e) {
        const back = confirmed.current[item.id] ?? item.quantity;
        setItems((list) => list.map((x) => (x.id === item.id ? { ...x, quantity: back } : x)));
        toast.error(e.status === 409 ? `${item.name} không còn đủ hàng.` : e.message);
        if (e.status === 409) load();
      } finally {
        setSyncing((s) => ({ ...s, [item.id]: false }));
      }
    }, 450);
  }

  async function remove() {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await api(`/shop/cart/${removing.id}`, { method: "DELETE" });
      setItems((list) => {
        const next = list.filter((x) => x.id !== removing.id);
        cartStore.set(next);
        return next;
      });
      toast.info(`Đã bỏ ${removing.name} khỏi giỏ`);
      setRemoving(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRemoveBusy(false);
    }
  }

  const total = items.reduce((s, x) => s + Number(x.price) * x.quantity, 0);
  const anySyncing = Object.values(syncing).some(Boolean);
  const problems = items.filter((x) => !x.isActive || x.quantity > x.stock);
  const count = items.reduce((s, x) => s + x.quantity, 0);

  return (
    <>
      <Screen header={<ScreenHeader title="Giỏ hàng" subtitle={items.length ? `${count} sản phẩm` : undefined} />} bottomInset={items.length ? 170 : 40}>
        {status === "loading" ? (
          <LoadingSkeleton variant="list" count={3} />
        ) : status === "error" ? (
          <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được giỏ hàng" message={error} actionLabel="Thử lại" onAction={load} />
        ) : !items.length ? (
          <EmptyState emoji="🛍️" title="Giỏ hàng đang trống" message="Bé đang chờ món quà nhỏ từ bạn đấy! Ghé Pet Shop chọn vài món xinh nhé." actionLabel="Quay lại Pet Shop" actionIcon="storefront" onAction={() => router.replace("/shop")} />
        ) : (
          <>
            {problems.length > 0 && (
              <View style={styles.warn} accessibilityRole="alert">
                <Icon name="warning" size={20} color={colors.warning} />
                <Text style={styles.warnText}>Một số sản phẩm đã ngừng bán hoặc vượt tồn kho. Hãy điều chỉnh trước khi đặt hàng.</Text>
              </View>
            )}
            {items.map((item, i) => {
              const problem = !item.isActive ? "Sản phẩm đã ngừng bán" : item.quantity > item.stock ? `Chỉ còn ${item.stock} sản phẩm` : "";
              return (
                <FadeIn key={item.id} index={i} style={[styles.item, !!problem && { borderColor: colors.warning }]}>
                  <Pressy onPress={() => router.push(`/products/${item.id}`)} accessibilityLabel={`Xem ${item.name}`} scaleTo={0.95}>
                    <SmartImage uri={item.imageUrl} style={styles.img} fallback="product" />
                  </Pressy>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Text style={styles.name} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <IconButton icon="trash-outline" label={`Bỏ ${item.name} khỏi giỏ`} onPress={() => setRemoving(item)} variant="ghost" size={40} color={colors.danger} />
                    </View>
                    <Text style={styles.unit}>{money(item.price)} / sản phẩm</Text>
                    {!!problem && <Text style={styles.problem}>{problem}</Text>}
                    <View style={styles.row}>
                      <Stepper value={item.quantity} onChange={(q) => changeQty(item, q)} max={Math.max(1, Math.min(99, item.stock))} disabled={!item.isActive} syncing={syncing[item.id]} size={40} />
                      <Text style={styles.line}>{money(Number(item.price) * item.quantity)}</Text>
                    </View>
                  </View>
                </FadeIn>
              );
            })}
            <View style={styles.note}>
              <Icon name="information-circle-outline" size={18} color={colors.inkSoft} />
              <Text style={styles.noteText}>Tổng tiền chưa gồm phí giao hàng. Cửa hàng sẽ gọi xác nhận phí và lịch giao trước khi gửi.</Text>
            </View>
          </>
        )}
      </Screen>
      {status === "ready" && items.length > 0 && (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.totalLabel}>{anySyncing ? "Đang cập nhật giỏ…" : "Tạm tính"}</Text>
            <Text style={styles.total}>{money(total)}</Text>
          </View>
          <Button title="Tiếp tục đặt hàng" iconRight="arrow-forward" variant="accent" size="lg" disabled={anySyncing || problems.length > 0} onPress={() => router.push("/checkout")} feedback="medium" />
        </View>
      )}
      <ConfirmSheet
        visible={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        loading={removeBusy}
        destructive
        icon="bag-remove-outline"
        title="Bỏ sản phẩm khỏi giỏ?"
        message={removing ? `${removing.name} (${removing.quantity} sản phẩm) sẽ được bỏ khỏi giỏ hàng.` : ""}
        confirmLabel="Bỏ khỏi giỏ"
        cancelLabel="Giữ lại"
      />
    </>
  );
}

const styles = StyleSheet.create({
  warn: { flexDirection: "row", gap: 10, backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: 14, marginBottom: 12 },
  warnText: { flex: 1, fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 19, color: colors.ink },
  item: { flexDirection: "row", gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  img: { width: 86, height: 86, borderRadius: radius.md },
  name: { flex: 1, fontFamily: fonts.heavy, fontSize: 15, lineHeight: 21, color: colors.ink },
  unit: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.inkSoft },
  problem: { fontFamily: fonts.heavy, fontSize: 12.5, color: colors.warning },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 8, flexWrap: "wrap" },
  line: { fontFamily: fonts.black, fontSize: 16, color: colors.primary },
  note: { flexDirection: "row", gap: 8, padding: 4, marginTop: 4 },
  noteText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 14, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...shadow.lifted },
  totalLabel: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.inkSoft },
  total: { fontFamily: fonts.black, fontSize: 22, color: colors.ink },
});
