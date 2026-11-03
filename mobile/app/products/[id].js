import React, { useEffect, useState } from "react";
import { ScrollView, Text, Image, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../src/services/api";
import {
  Title,
  Caption,
  TextField,
  PrimaryButton,
  ErrorText,
} from "../../src/components/UI";
import { money } from "../../src/utils/format";
import { useAuth } from "../../src/context/AuthContext";
import { trackView } from "../../src/services/traffic";
export default function Product() {
  const { user } = useAuth();
  const employee = ["manager", "staff"].includes(user?.role);
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState(null),
    [selectedImage, setSelectedImage] = useState(0),
    [count, setCount] = useState("1"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = () =>
    api(`/shop/products/${id}`)
      .then((r) => { setProduct(r.product); setSelectedImage(0); if (!employee) trackView(id); })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [id]);
  async function add() {
    setBusy(true);
    setError("");
    try {
      await api(`/shop/cart/${id}`, {
        method: "PUT",
        body: { quantity: Number(count) },
      });
      router.push("/cart");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 50 }}>
      <ErrorText error={error} />
      {product ? (
        <>
          <Title>{product.name}</Title>
          <Caption>{product.category}</Caption>
          {(product.imageUrls?.length > 0 || product.imageUrl) && <>
            <Image
              source={{ uri: product.imageUrls?.[selectedImage] || product.imageUrl }}
              style={{ height: 240 }}
              resizeMode="contain"
            />
            <ScrollView horizontal contentContainerStyle={{gap:10,paddingVertical:12}}>
              {(product.imageUrls?.length ? product.imageUrls : [product.imageUrl]).map((url,index) =>
                <Pressable key={url} accessibilityRole="button" accessibilityLabel={`Xem ảnh ${index+1}`} accessibilityState={{selected:selectedImage === index}}
                  onPress={() => setSelectedImage(index)} style={{borderWidth:2,borderColor:selectedImage===index ? "#24594B" : "transparent",borderRadius:10,padding:4}}>
                  <Image source={{uri:url}} style={{width:76,height:76}} resizeMode="contain" />
                </Pressable>)}
            </ScrollView>
          </>}
          <Text style={{ fontSize: 22, marginVertical: 18, fontWeight: "700" }}>
            {money(product.price)}
          </Text>
          <Caption>{product.description}</Caption>
          <Caption>Còn {product.stock} sản phẩm</Caption>
          {employee ? <PrimaryButton title="Về quản lý cửa hàng" onPress={() => router.push("/manage")} /> : <>
          <TextField
            label="Số lượng (1–99)"
            keyboardType="number-pad"
            value={count}
            onChangeText={setCount}
          />
          <PrimaryButton
            title="Đặt số lượng trong giỏ"
            loading={busy}
            disabled={!product.stock}
            onPress={add}
          />
          </>}
        </>
      ) : (
        <PrimaryButton title="Tải lại" onPress={load} />
      )}
    </ScrollView>
  );
}
