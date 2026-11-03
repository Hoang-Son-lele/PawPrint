import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/services/api";
import { useAuth } from "../src/context/AuthContext";
import { colors, fonts, radius, shadow } from "../src/theme";
import { money } from "../src/utils/format";
import ScreenHeader from "../src/components/ScreenHeader";
import FormField from "../src/components/FormField";
import Button from "../src/components/Button";
import EmptyState from "../src/components/EmptyState";
import LoadingSkeleton from "../src/components/LoadingSkeleton";
import SmartImage from "../src/components/SmartImage";
import Pressy from "../src/components/Pressy";
import FadeIn from "../src/components/FadeIn";
import Icon from "../src/components/Icon";
import { useToast } from "../src/components/Toast";
import { cartStore } from "../src/features/shop/cartStore";

const PHONE = /^(\+?84|0)(3|5|7|8|9)\d{8}$/;

function Step({ n, label, active, done }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, (active || done) && styles.stepDotOn]}>
        {done ? <Icon name="checkmark" size={14} color={colors.primaryDark} /> : <Text style={[styles.stepNum, active && { color: colors.primaryDark }]}>{n}</Text>}
      </View>
      <Text style={[styles.stepLabel, active && { color: colors.primary }]}>{label}</Text>
    </View>
  );
}

export default function Checkout() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState("info");
  const [form, setForm] = useState({ recipient: user?.displayName || "", phone: "", address: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(null);
  const lock = useRef(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await api("/shop/cart");
      setCart(r);
      cartStore.set(r.items);
      setStatus("ready");
    } catch (e) {
      setLoadError(e.message);
      setStatus("error");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    key.current = null; // thông tin đổi -> đơn mới
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  function validate() {
    const e = {};
    if (!form.recipient.trim()) e.recipient = "Nhập tên người nhận hàng.";
    else if (form.recipient.trim().length > 100) e.recipient = "Tên tối đa 100 ký tự.";
    if (!PHONE.test(form.phone.replace(/[\s.-]/g, ""))) e.phone = "Số điện thoại chưa đúng, ví dụ 0912 345 678.";
    if (form.address.trim().length < 10) e.address = "Ghi rõ số nhà, đường, phường/xã, quận/huyện, tỉnh/thành.";
    else if (form.address.trim().length > 500) e.address = "Địa chỉ tối đa 500 ký tự.";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit() {
    if (lock.current) return; // chặn gửi lặp
    lock.current = true;
    setBusy(true);
    setSubmitError(null);
    try {
      if (!key.current) key.current = (await api("/shop/checkout-key")).requestKey;
      const r = await api("/shop/orders", {
        method: "POST",
        body: { requestKey: key.current, recipient: form.recipient.trim(), phone: form.phone.replace(/[\s.-]/g, ""), address: form.address.trim() },
      });
      key.current = null;
      cartStore.set(0);
      toast.success("Đặt hàng thành công! Cửa hàng sẽ sớm liên hệ bạn.");
      router.replace(`/orders/${r.order.id}?placed=1`);
    } catch (e) {
      if (e.network || e.retryable) setSubmitError({ kind: "retry", message: `${e.message} Đơn hàng chưa bị trùng – bạn có thể bấm thử lại an toàn.` });
      else if (e.status === 409) {
        key.current = null;
        setSubmitError({ kind: "stock", message: `${e.message} Giỏ hàng đã được cập nhật, hãy kiểm tra lại.` });
        load();
      } else {
        key.current = null;
        setSubmitError({ kind: "edit", message: e.message });
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (status !== "ready" || !cart?.items.length)
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Đặt hàng" />
        <View style={{ padding: 18 }}>
          {status === "loading" ? (
            <LoadingSkeleton variant="form" count={3} />
          ) : status === "error" ? (
            <EmptyState tone="error" icon="cloud-offline-outline" title="Chưa tải được giỏ hàng" message={loadError} actionLabel="Thử lại" onAction={load} />
          ) : (
            <EmptyState emoji="🛍️" title="Giỏ hàng đang trống" message="Hãy chọn vài món cho bé trước khi đặt hàng nhé." actionLabel="Về Pet Shop" onAction={() => router.replace("/shop")} />
          )}
        </View>
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Đặt hàng" subtitle={step === "info" ? "Bước 1/2 · Thông tin giao hàng" : "Bước 2/2 · Xác nhận đơn"} onBack={step === "review" ? () => setStep("info") : undefined} />
      <View style={styles.steps}>
        <Step n={1} label="Giao hàng" active={step === "info"} done={step === "review"} />
        <View style={styles.stepLine} />
        <Step n={2} label="Xác nhận" active={step === "review"} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {step === "info" ? (
            <FadeIn key="info" from="right">
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Người nhận</Text>
                <FormField label="Họ tên người nhận" required icon="person-outline" autoCapitalize="words" value={form.recipient} onChangeText={set("recipient")} error={errors.recipient} maxLength={100} />
                <FormField label="Số điện thoại" required icon="call-outline" keyboardType="phone-pad" placeholder="0912 345 678" value={form.phone} onChangeText={set("phone")} error={errors.phone} />
                <FormField label="Địa chỉ giao hàng" required icon="location-outline" multiline placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" value={form.address} onChangeText={set("address")} error={errors.address} maxLength={500} />
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Phương thức thanh toán</Text>
                <Pressy style={[styles.pay, styles.payOn]} accessibilityRole="radio" accessibilityState={{ selected: true }} accessibilityLabel="Thanh toán khi nhận hàng, đã chọn">
                  <Icon name="cash-outline" size={24} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payTitle}>Thanh toán khi nhận hàng (COD)</Text>
                    <Text style={styles.paySub}>Trả tiền mặt cho người giao hàng</Text>
                  </View>
                  <Icon name="radio-button-on" size={22} color={colors.primary} />
                </Pressy>
                <View style={[styles.pay, { opacity: 0.5 }]} accessibilityState={{ disabled: true }} accessibilityLabel="Chuyển khoản hoặc ví điện tử, sắp ra mắt">
                  <Icon name="card-outline" size={24} color={colors.inkSoft} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payTitle}>Chuyển khoản / Ví điện tử</Text>
                    <Text style={styles.paySub}>Sắp ra mắt</Text>
                  </View>
                  <Icon name="radio-button-off" size={22} color={colors.muted} />
                </View>
              </View>
            </FadeIn>
          ) : (
            <FadeIn key="review" from="right">
              {submitError && (
                <View style={[styles.error, submitError.kind === "retry" && { backgroundColor: colors.warningSoft }]} accessibilityRole="alert">
                  <Icon name={submitError.kind === "retry" ? "cloud-offline-outline" : "alert-circle"} size={20} color={submitError.kind === "retry" ? colors.warning : colors.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.errorTitle}>{submitError.kind === "retry" ? "Chưa gửi được đơn – có thể thử lại" : submitError.kind === "stock" ? "Tồn kho vừa thay đổi" : "Cần chỉnh lại thông tin"}</Text>
                    <Text style={styles.errorText}>{submitError.message}</Text>
                    {submitError.kind === "edit" && <Button title="Sửa thông tin" size="sm" variant="danger" onPress={() => setStep("info")} style={{ alignSelf: "flex-start", marginTop: 8 }} />}
                    {submitError.kind === "stock" && <Button title="Về giỏ hàng" size="sm" variant="danger" onPress={() => router.replace("/cart")} style={{ alignSelf: "flex-start", marginTop: 8 }} />}
                  </View>
                </View>
              )}
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>Giao đến</Text>
                  <Button title="Sửa" size="sm" variant="ghost" icon="create-outline" onPress={() => setStep("info")} disabled={busy} />
                </View>
                <Text style={styles.reviewName}>
                  {form.recipient} · {form.phone}
                </Text>
                <Text style={styles.reviewAddr}>{form.address}</Text>
                <View style={styles.codPill}>
                  <Icon name="cash-outline" size={14} color={colors.success} />
                  <Text style={styles.codText}>Thanh toán khi nhận hàng</Text>
                </View>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sản phẩm ({cart.items.reduce((s, x) => s + x.quantity, 0)})</Text>
                {cart.items.map((x) => (
                  <View key={x.id} style={styles.line}>
                    <SmartImage uri={x.imageUrl} style={styles.lineImg} fallback="product" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineName} numberOfLines={2}>
                        {x.name}
                      </Text>
                      <Text style={styles.lineQty}>
                        {x.quantity} × {money(x.price)}
                      </Text>
                    </View>
                    <Text style={styles.lineTotal}>{money(Number(x.price) * x.quantity)}</Text>
                  </View>
                ))}
                <View style={styles.sum}>
                  <Text style={styles.sumLabel}>Tổng tiền hàng</Text>
                  <Text style={styles.sumValue}>{money(cart.total)}</Text>
                </View>
                <Text style={styles.sumNote}>Chưa gồm phí giao hàng – cửa hàng sẽ gọi xác nhận trước khi gửi.</Text>
              </View>
            </FadeIn>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.total}>{money(cart.total)}</Text>
        </View>
        {step === "info" ? (
          <Button title="Xem lại đơn" iconRight="arrow-forward" size="lg" onPress={() => validate() && setStep("review")} />
        ) : (
          <Button title={submitError?.kind === "retry" ? "Thử gửi lại" : "Đặt hàng"} icon={submitError?.kind === "retry" ? "refresh" : "paw"} variant="accent" size="lg" onPress={submit} loading={busy} loadingText="Đang gửi đơn…" feedback="medium" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: "row", alignItems: "center", paddingHorizontal: 40, paddingBottom: 8, maxWidth: 520, width: "100%", alignSelf: "center" },
  step: { alignItems: "center", gap: 4 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  stepDotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepNum: { fontFamily: fonts.black, fontSize: 13, color: colors.muted },
  stepLabel: { fontFamily: fonts.heavy, fontSize: 12, color: colors.inkSoft },
  stepLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.primaryTint, marginHorizontal: 8, marginBottom: 18 },
  content: { padding: 18, paddingBottom: 140, width: "100%", maxWidth: 760, alignSelf: "center" },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontFamily: fonts.heavy, fontSize: 16, color: colors.ink, marginBottom: 10 },
  pay: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, marginBottom: 8, minHeight: 64 },
  payOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  payTitle: { fontFamily: fonts.heavy, fontSize: 14.5, color: colors.ink },
  paySub: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.inkSoft },
  error: { flexDirection: "row", gap: 10, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 14, marginBottom: 14 },
  errorTitle: { fontFamily: fonts.heavy, fontSize: 14.5, color: colors.ink },
  errorText: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19, color: colors.inkSoft, marginTop: 2 },
  reviewName: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  reviewAddr: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, color: colors.inkSoft, marginTop: 4 },
  codPill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: colors.successSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  codText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.success },
  line: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  lineImg: { width: 52, height: 52, borderRadius: 12 },
  lineName: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  lineQty: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  lineTotal: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink },
  sum: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 6 },
  sumLabel: { fontFamily: fonts.heavy, fontSize: 15, color: colors.ink },
  sumValue: { fontFamily: fonts.black, fontSize: 18, color: colors.primary },
  sumNote: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, marginTop: 6 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 14, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...shadow.lifted },
  totalLabel: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.inkSoft },
  total: { fontFamily: fonts.black, fontSize: 22, color: colors.ink },
});

