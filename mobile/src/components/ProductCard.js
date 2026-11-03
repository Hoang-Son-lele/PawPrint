import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow } from "../theme";
import { money } from "../utils/format";
import SmartImage from "./SmartImage";
import Pressy from "./Pressy";
import Icon from "./Icon";

/** Danh mục có thể là thú cưng sống – cần nhãn tham khảo, không tạo cảm giác bán thật khi chưa xác thực. */
export const isLivePetCategory = (category) => /(chó|mèo)\s*cảnh|thú\s*cưng\s*sống/i.test(category || "");

export function stockInfo(stock) {
  if (stock <= 0) return { label: "Tạm hết hàng", icon: "close-circle", fg: colors.danger, bg: colors.dangerSoft };
  if (stock <= 5) return { label: `Chỉ còn ${stock}`, icon: "alert-circle", fg: colors.warning, bg: colors.warningSoft };
  return { label: "Còn hàng", icon: "checkmark-circle", fg: colors.success, bg: colors.successSoft };
}

/** Card sản phẩm: ảnh, tên, danh mục, giá, tình trạng hàng, nút xem chi tiết. */
export default function ProductCard({ product, onPress, width }) {
  const stock = stockInfo(Number(product.stock));
  const live = isLivePetCategory(product.category);
  return (
    <Pressy
      onPress={onPress}
      feedback="tap"
      scaleTo={0.97}
      accessibilityLabel={`${product.name}, ${product.category}, ${money(product.price)}, ${stock.label}. Xem chi tiết`}
      style={[styles.card, width != null && { width }]}
    >
      <View>
        <SmartImage uri={product.imageUrl} style={styles.image} fallback="product" />
        {live && (
          <View style={styles.live}>
            <Icon name="information-circle" size={13} color={colors.primary} />
            <Text style={styles.liveText}>Thông tin tham khảo</Text>
          </View>
        )}
        {Number(product.stock) <= 0 && <View style={styles.soldOut} />}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.category}>
          {product.category}
        </Text>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.price}>{money(product.price)}</Text>
        <View style={styles.footer}>
          <View style={[styles.stock, { backgroundColor: stock.bg }]}>
            <Icon name={stock.icon} size={12} color={stock.fg} />
            <Text style={[styles.stockText, { color: stock.fg }]}>{stock.label}</Text>
          </View>
          <View style={styles.more} accessibilityElementsHidden>
            <Icon name="arrow-forward" size={16} color={colors.primary} />
          </View>
        </View>
      </View>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  image: { width: "100%", aspectRatio: 1.05, backgroundColor: colors.backgroundAlt },
  live: {
    position: "absolute",
    left: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveText: { fontFamily: fonts.heavy, fontSize: 10.5, color: colors.primary },
  soldOut: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.45)" },
  body: { padding: 12, gap: 3 },
  category: { fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.accentDark },
  name: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: colors.ink, minHeight: 42 },
  price: { fontFamily: fonts.black, fontSize: 17, color: colors.primary, marginTop: 4 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 6 },
  stock: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, flexShrink: 1 },
  stockText: { fontFamily: fonts.heavy, fontSize: 11 },
  more: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
});

