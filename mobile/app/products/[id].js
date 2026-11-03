import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../src/services/api";
import { useAuth } from "../../src/context/AuthContext";
import { trackView } from "../../src/services/traffic";
import { colors, fonts, radius, shadow } from "../../src/theme";
import { money } from "../../src/utils/format";
import { useReducedMotion } from "../../src/hooks/useReducedMotion";
import { haptic } from "../../src/utils/haptics";
import SmartImage from "../../src/components/SmartImage";
import Stepper from "../../src/components/Stepper";
import Button, { IconButton } from "../../src/components/Button";
import EmptyState from "../../src/components/EmptyState";
import LoadingSkeleton from "../../src/components/LoadingSkeleton";
import FadeIn from "../../src/components/FadeIn";
import Icon from "../../src/components/Icon";
import { useToast } from "../../src/components/Toast";
import { Paw } from "../../src/components/Decor";
import { isLivePetCategory, stockInfo } from "../../src/components/ProductCard";
import { cartStore, useCartCount } from "../../src/features/shop/cartStore";

export default function Product() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const employee = ["manager", "staff"].includes(user?.role);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const toast = useToast();
  const reduced = useReducedMotion();
  const cartCount = useCartCount();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [flying, setFlying] = useState(false);
  const fly = useRef(new Animated.Value(0)).current;
  const cartBump = useRef(new Animated.Value(1)).current;

  const galleryW = Math.min(width, 760);
  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const r = await api(`/shop/products/${id}`);
      setProduct(r.product);
      setIndex(0);
      setStatus("ready");
      if (!employee) trackView(id);
    } catch (e) {
      setError(e.message);
      setStatus(e.status === 404 ? "missing" : "error");
    }
  }, [id, employee]);
  useEffect(() => {
    load();
    if (!employee) cartStore.refresh();
  }, [load, employee]);

  const images = product ? (product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [null]) : [];
  const stock = Number(product?.stock || 0);
  const maxQty = Math.max(1, Math.min(99, stock));

  function animateToCart() {
    if (reduced) return;
    setFlying(true);
    fly.setValue(0);
    Animated.timing(fly, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== "web" }).start(() => {
      setFlying(false);
      Animated.sequence([
        Animated.spring(cartBump, { toValue: 1.25, speed: 30, bounciness: 12, useNativeDriver: Platform.OS !== "web" }),
        Animated.spring(cartBump, { toValue: 1, speed: 20, bounciness: 8, useNativeDriver: Platform.OS !== "web" }),
      ]).start();
    });
  }

  async function add() {
    if (busy || !product) return;
    setBusy(true);
    try {
      const cart = await api("/shop/cart");
      const existing = cart.items.find((x) => String(x.id).toLowerCase() === String(product.id).toLowerCase())?.quantity || 0;
      const target = Math.min(99, stock, existing + qty);
      if (target <= existing) {
        toast.info(`Giỏ đã có ${existing} sản phẩm này – tối đa theo tồn kho.`, { action: "Xem giỏ", onAction: () => router.push("/cart") });
        return;
      }
      await api(`/shop/cart/${product.id}`, { method: "PUT", body: { quantity: target } });
      cartStore.set(cart.items.filter((x) => String(x.id).toLowerCase() !== String(product.id).toLowerCase()).concat({ quantity: target }));
      haptic.success();
      animateToCart();
      toast.success(`Đã thêm ${target - existing} × ${product.name} vào giỏ`, { action: "Xem giỏ", onAction: () => router.push("/cart") });
    } catch (e) {
      toast.error(e.status === 409 ? "Sản phẩm không còn đủ hàng. Hãy giảm số lượng." : e.message);
      if (e.status === 409) load();
    } finally {
      setBusy(false);
    }
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace("/shop"));
  const topBar = (
    <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
      <IconButton icon="chevron-back" label="Quay lại" onPress={back} variant="outline" />
      {!employee && (
        <Animated.View style={{ transform: [{ scale: cartBump }] }}>
          <IconButton icon="bag-handle" label={`Giỏ hàng, ${cartCount} sản phẩm`} onPress={() => router.push("/cart")} variant="primary" badge={cartCount} />
        </Animated.View>
      )}
    </View>
  );

  if (status !== "ready")
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {topBar}
        <View style={{ padding: 18, paddingTop: insets.top + 70 }}>
          {status === "loading" ? (
            <LoadingSkeleton variant="hero" />
          ) : (
            <EmptyState tone="error" icon={status === "missing" ? "search" : "cloud-offline-outline"} title={status === "missing" ? "Sản phẩm không còn bán" : "Chưa tải được sản phẩm"} message={status === "missing" ? "Sản phẩm này có thể đã ngừng kinh doanh." : error} actionLabel={status === "missing" ? "Về Pet Shop" : "Thử lại"} onAction={status === "missing" ? () => router.replace("/shop") : load} />
          )}
        </View>
      </View>
    );

  const s = stockInfo(stock);
  const live = isLivePetCategory(product.category);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}>
        {/* ---------- Gallery ---------- */}
        <View style={{ width: galleryW, alignSelf: "center" }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / galleryW))}
            scrollEventThrottle={32}
            accessibilityLabel={`Bộ ảnh sản phẩm, ${images.length} ảnh`}
          >
            {images.map((url, i) => (
              <SmartImage key={`${url}-${i}`} uri={url} style={{ width: galleryW, height: Math.min(galleryW, height * 0.5) }} resizeMode="cover" fallback="product" label={`Ảnh ${i + 1} của ${product.name}`} />
            ))}
          </ScrollView>
          {images.length > 1 && (
            <>
              <View style={styles.dots} accessibilityLabel={`Ảnh ${index + 1} trên ${images.length}`}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
              </View>
              <View style={styles.counter}>
                <Text style={styles.counterText}>
                  {index + 1}/{images.length}
                </Text>
              </View>
            </>
          )}
        </View>

        <FadeIn style={styles.body}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.name} accessibilityRole="header">
            {product.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{money(product.price)}</Text>
            <View style={[styles.stock, { backgroundColor: s.bg }]}>
              <Icon name={s.icon} size={14} color={s.fg} />
              <Text style={[styles.stockText, { color: s.fg }]}>{s.label}</Text>
            </View>
          </View>
          {live && (
            <View style={styles.notice}>
              <Icon name="information-circle" size={20} color={colors.info} />
              <Text style={styles.noticeText}>Thông tin chỉ mang tính tham khảo. Hãy liên hệ cửa hàng để xác thực nguồn gốc, giấy tờ và sức khỏe trước khi đặt.</Text>
            </View>
          )}
          <View style={styles.descCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.descTitle}>Mô tả sản phẩm</Text>
            </View>
            <Text style={styles.desc}>{product.description || "Cửa hàng chưa cập nhật mô tả cho sản phẩm này."}</Text>
          </View>
          <View style={styles.perks}>
            {[
              ["cash-outline", "Thanh toán khi nhận hàng"],
              ["call-outline", "Cửa hàng gọi xác nhận trước khi giao"],
            ].map(([icon, text]) => (
              <View key={text} style={styles.perk}>
                <Icon name={icon} size={18} color={colors.success} />
                <Text style={styles.perkText}>{text}</Text>
              </View>
            ))}
          </View>
        </FadeIn>
      </ScrollView>
      {topBar}

      {/* ---------- CTA cố định ---------- */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {employee ? (
          <Button title="Về quản lý cửa hàng" icon="briefcase-outline" onPress={() => router.replace("/manage")} full style={{ flex: 1 }} />
        ) : (
          <>
            <Stepper value={qty} onChange={(v) => setQty(Math.max(1, Math.min(maxQty, v)))} max={maxQty} disabled={!stock || busy} />
            <Button title={stock ? "Thêm vào giỏ" : "Tạm hết hàng"} icon="bag-add" variant="accent" onPress={add} loading={busy} disabled={!stock} feedback="medium" style={{ flex: 1 }} />
          </>
        )}
      </View>

      {flying && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flyer,
            {
              opacity: fly.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [width * 0.6, width - 50] }) },
                { translateY: fly.interpolate({ inputRange: [0, 0.4, 1], outputRange: [height - 90 - insets.bottom, height * 0.35, insets.top + 18] }) },
                { scale: fly.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.4, 0.5] }) },
                { rotate: fly.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "40deg"] }) },
              ],
            },
          ]}
        >
          <Paw size={34} color={colors.accent} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 },
  dots: { position: "absolute", bottom: 14, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.65)" },
  dotActive: { width: 22, backgroundColor: colors.accent },
  counter: { position: "absolute", right: 14, bottom: 10, backgroundColor: "rgba(7,26,58,0.6)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  counterText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.white },
  body: { padding: 18, width: "100%", maxWidth: 760, alignSelf: "center" },
  category: { fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: colors.accentDark },
  name: { fontFamily: fonts.black, fontSize: 24, lineHeight: 31, color: colors.ink, marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 10, flexWrap: "wrap" },
  price: { fontFamily: fonts.black, fontSize: 26, color: colors.primary },
  stock: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  stockText: { fontFamily: fonts.heavy, fontSize: 12.5 },
  notice: { flexDirection: "row", gap: 10, backgroundColor: colors.infoSoft, borderRadius: radius.md, padding: 14, marginTop: 14 },
  noticeText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 19, color: colors.ink },
  descCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border },
  descTitle: { fontFamily: fonts.heavy, fontSize: 15.5, color: colors.ink },
  desc: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 24, color: colors.inkSoft },
  perks: { gap: 8, marginTop: 14 },
  perk: { flexDirection: "row", alignItems: "center", gap: 10 },
  perkText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 12, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, ...shadow.lifted },
  flyer: { position: "absolute", left: 0, top: 0 },
});
