import React, { useCallback, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "../../services/api";
import { colors, fonts, radius, shadow } from "../../theme";
import { selectProductPhotos, uploadProductImage } from "../../services/media";
import { FilterChipRow } from "../../components/FilterChip";
import FormField from "../../components/FormField";
import Button from "../../components/Button";
import SmartImage from "../../components/SmartImage";
import Pressy from "../../components/Pressy";
import Icon from "../../components/Icon";

export const emptyProduct = { name: "", category: "", description: "", price: "", stock: "", imageUrl: "", imageUrls: [], isActive: true };

/** Form thêm/sửa sản phẩm – nhiều ảnh, tiến trình tải lên Cloudinary từng ảnh. */
export default function ProductEditor({ form, onChange, editing, busy, onSave, onCancel, onUploadBusy = () => {} }) {
  const [uploading, setUploading] = useState(null); // { index, total, progress }
  const [imageError, setImageError] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(true);
  const images = form.imageUrls || (form.imageUrl ? [form.imageUrl] : []);
  const setImages = (imageUrls) => onChange({ ...form, imageUrls, imageUrl: imageUrls[0] || "" });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadingCategories(true);
      setCategoryError("");
      api("/admin/categories")
        .then((r) => active && setCategories(r.items))
        .catch((e) => active && setCategoryError(e.message))
        .finally(() => active && setLoadingCategories(false));
      return () => {
        active = false;
      };
    }, []),
  );

  async function chooseImages() {
    setImageError("");
    try {
      const assets = await selectProductPhotos(10 - images.length);
      if (!assets.length) return;
      onUploadBusy(true);
      let uploaded = [...images];
      for (let i = 0; i < assets.length; i++) {
        setUploading({ index: i, total: assets.length, progress: 0.02 });
        const r = await uploadProductImage(assets[i], (p) => setUploading({ index: i, total: assets.length, progress: p }));
        uploaded = [...uploaded, r.imageUrl];
        onChange((current) => ({ ...current, imageUrls: uploaded, imageUrl: uploaded[0] || "" }));
      }
    } catch (e) {
      setImageError(`${e.message} Các ảnh đã tải xong vẫn được giữ lại.`);
    } finally {
      setUploading(null);
      onUploadBusy(false);
    }
  }

  const validCategory = categories.some((c) => c.name === form.category);
  const disabled = busy || !!uploading;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{editing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</Text>

      <Text style={styles.label}>
        Danh mục <Text style={{ color: colors.danger }}>*</Text>
      </Text>
      {loadingCategories ? (
        <Text style={styles.hint}>Đang tải danh mục…</Text>
      ) : categories.length ? (
        <FilterChipRow wrap options={categories.map((c) => ({ id: c.name, label: c.name }))} value={form.category} onChange={(category) => onChange({ ...form, category })} disabled={disabled} />
      ) : (
        <Text style={styles.hint}>Chưa có danh mục. Vào tab Danh mục để thêm trước.</Text>
      )}
      {!!categoryError && <Text style={styles.error}>{categoryError}</Text>}
      {!!form.category && !loadingCategories && !validCategory && <Text style={styles.error}>Danh mục đã thay đổi tên hoặc bị xóa. Hãy chọn lại.</Text>}

      <View style={{ marginTop: 12 }}>
        <FormField label="Tên sản phẩm" required value={form.name} onChangeText={(name) => onChange({ ...form, name })} editable={!disabled} maxLength={160} />
        <FormField label="Mô tả" multiline value={form.description} onChangeText={(description) => onChange({ ...form, description })} editable={!disabled} maxLength={2000} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <FormField label="Giá bán" required suffix="đ" keyboardType="number-pad" value={String(form.price)} onChangeText={(price) => onChange({ ...form, price: price.replace(/[^\d]/g, "") })} editable={!disabled} style={{ flex: 1 }} />
          <FormField label="Tồn kho" required keyboardType="number-pad" value={String(form.stock)} onChangeText={(stock) => onChange({ ...form, stock: stock.replace(/[^\d]/g, "") })} editable={!disabled} style={{ flex: 1 }} />
        </View>
      </View>

      <Text style={styles.label}>Ảnh sản phẩm ({images.length}/10)</Text>
      <Text style={styles.hint}>Ảnh đầu tiên là ảnh bìa hiển thị trong cửa hàng.</Text>
      <View style={styles.images}>
        {images.map((url, index) => (
          <View key={url} style={styles.imageTile}>
            <SmartImage uri={url} style={styles.image} fallback="product" />
            {index === 0 && (
              <View style={styles.cover}>
                <Text style={styles.coverText}>Ảnh bìa</Text>
              </View>
            )}
            <View style={styles.imageActions}>
              {index > 0 && (
                <Pressy onPress={() => setImages([url, ...images.filter((_, i) => i !== index)])} disabled={disabled} style={styles.imgBtn} accessibilityLabel={`Đặt ảnh ${index + 1} làm ảnh bìa`}>
                  <Icon name="star" size={14} color={colors.accent} />
                </Pressy>
              )}
              <Pressy onPress={() => setImages(images.filter((_, i) => i !== index))} disabled={disabled} style={styles.imgBtn} accessibilityLabel={`Bỏ ảnh ${index + 1}`}>
                <Icon name="close" size={14} color={colors.white} />
              </Pressy>
            </View>
          </View>
        ))}
        {images.length < 10 && (
          <Pressy onPress={chooseImages} disabled={disabled} style={[styles.imageTile, styles.add]} accessibilityLabel="Thêm ảnh sản phẩm">
            <Icon name="images-outline" size={26} color={colors.primary} />
            <Text style={styles.addText}>Thêm ảnh</Text>
          </Pressy>
        )}
      </View>
      {uploading && (
        <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(uploading.progress * 100) }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={styles.progressText}>
              Đang tải ảnh {uploading.index + 1}/{uploading.total} lên Cloudinary…
            </Text>
            <Text style={styles.progressPct}>{Math.round(uploading.progress * 100)}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(3, uploading.progress * 100)}%` }]} />
          </View>
        </View>
      )}
      {!!imageError && <Text style={styles.error}>{imageError}</Text>}

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Hiển thị trong cửa hàng</Text>
          <Text style={styles.hint}>{form.isActive ? "Khách hàng có thể xem và đặt mua." : "Sản phẩm đang ẩn khỏi Pet Shop."}</Text>
        </View>
        <Switch disabled={disabled} value={!!form.isActive} onValueChange={(isActive) => onChange({ ...form, isActive })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} accessibilityLabel="Hiển thị trong cửa hàng" />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        {editing && <Button title="Hủy" variant="outline" onPress={onCancel} disabled={busy} style={{ flex: 1 }} />}
        <Button title={editing ? "Lưu thay đổi" : "Thêm sản phẩm"} icon="checkmark" onPress={onSave} loading={busy && !uploading} disabled={!!uploading || loadingCategories || !validCategory} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  title: { fontFamily: fonts.black, fontSize: 19, color: colors.ink, marginBottom: 12 },
  label: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, marginTop: 6 },
  hint: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  error: { fontFamily: fonts.bold, fontSize: 13, color: colors.danger, marginTop: 6 },
  images: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  imageTile: { width: 104, height: 104, borderRadius: radius.md, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  cover: { position: "absolute", left: 6, top: 6, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  coverText: { fontFamily: fonts.heavy, fontSize: 10, color: colors.primaryDark },
  imageActions: { position: "absolute", right: 4, bottom: 4, flexDirection: "row", gap: 4 },
  imgBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(7,26,58,0.7)", alignItems: "center", justifyContent: "center" },
  add: { borderWidth: 2, borderStyle: "dashed", borderColor: colors.primaryTint, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", gap: 4 },
  addText: { fontFamily: fonts.heavy, fontSize: 12.5, color: colors.primary },
  progress: { marginTop: 12 },
  progressText: { fontFamily: fonts.bold, fontSize: 13, color: colors.inkSoft },
  progressPct: { fontFamily: fonts.black, fontSize: 13, color: colors.primary },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.primarySoft, marginTop: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, backgroundColor: colors.accent },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.backgroundAlt },
});
