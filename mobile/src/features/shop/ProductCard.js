import React from "react";
import { Pressable, View, Image, Text, StyleSheet } from "react-native";
import { palette, typography } from "../../theme";
import { money } from "../../utils/format";
export default function ProductCard({ product, onPress, width }) {
  return (
    <Pressable onPress={onPress} style={[s.card, { width }]}>
      <View style={s.photo}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={s.image}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: 42 }}>🐾</Text>
        )}
      </View>
      <View style={s.body}>
        <Text style={s.category}>{product.category}</Text>
        <Text style={s.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={s.price}>{money(product.price)}</Text>
        <Text style={s.stock}>
          {product.stock > 0 ? "Còn hàng" : "Tạm hết hàng"} · Xem chi tiết
        </Text>
      </View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: {
    maxWidth: "100%",
    backgroundColor: palette.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.border,
  },
  photo: {
    height: 180,
    backgroundColor: "#F2F5FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  image: { width: "100%", height: "100%" },
  body: { padding: 18 },
  category: {
    fontSize: 12,
    lineHeight: 20,
    color: palette.muted,
    marginBottom: 5,
  },
  name: {
    ...typography.heading,
    fontSize: 17,
    lineHeight: 25,
    color: palette.ink,
    minHeight: 50,
  },
  price: {
    ...typography.heading,
    fontSize: 19,
    lineHeight: 28,
    color: palette.primary,
    marginTop: 12,
  },
  stock: { fontSize: 12, lineHeight: 19, color: palette.muted, marginTop: 6 },
});
