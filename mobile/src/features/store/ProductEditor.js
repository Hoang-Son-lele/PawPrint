import React, { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "../../services/api";
import ChoiceChips from "../../components/ChoiceChips";
import { Text, Switch, Image, View } from "react-native";
import {
  Card,
  Caption,
  TextField,
  PrimaryButton,
  ErrorText,
} from "../../components/UI";
import { selectProductPhotos, uploadProductImage } from "../../services/media";
export const emptyProduct = {
  name: "",
  category: "",
  description: "",
  price: "",
  stock: "",
  imageUrl: "",
  imageUrls: [],
  isActive: true,
};
const fields = {
  name: "Tên sản phẩm",
  description: "Mô tả",
  price: "Giá bán (VND)",
  stock: "Số lượng tồn kho",
};
export default function ProductEditor({
  form,
  onChange,
  editing,
  busy,
  onSave,
  onCancel,
  onUploadBusy = () => {},
}) {
  const [uploading, setUploading] = useState(false),
    [imageError, setImageError] = useState("");
  const [progress, setProgress] = useState("");
  const images = form.imageUrls || (form.imageUrl ? [form.imageUrl] : []);
  function setImages(imageUrls) { onChange({...form, imageUrls, imageUrl:imageUrls[0] || ""}); }
  const [categories, setCategories] = useState([]), [categoryError, setCategoryError] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(true);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadingCategories(true); setCategoryError("");
    api("/admin/categories").then(r => { if (active) setCategories(r.items); })
      .catch(e => { if (active) setCategoryError(e.message); })
      .finally(() => { if (active) setLoadingCategories(false); });
    return () => { active = false; };
  }, []));
  async function chooseImage() {
    setImageError("");
    try {
      const assets = await selectProductPhotos(10 - images.length);
      if (!assets.length) return;
      setUploading(true);
      onUploadBusy(true);
      let uploaded = [...images];
      for (let index = 0; index < assets.length; index++) {
        setProgress(`Đang tải ảnh ${index + 1}/${assets.length}…`);
        const r = await uploadProductImage(assets[index]);
        uploaded = [...uploaded, r.imageUrl];
        onChange(current => ({...current, imageUrls:uploaded, imageUrl:uploaded[0] || ""}));
      }
    } catch (e) {
      setImageError(e.message);
    } finally {
      setUploading(false);
      setProgress("");
      onUploadBusy(false);
    }
  }
  return (
    <Card>
      <Text style={{ fontWeight: "700", fontSize: 20, lineHeight: 28 }}>
        {editing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
      </Text>
      <Caption>Danh mục sản phẩm * (bắt buộc chọn)</Caption>
      <ChoiceChips options={categories.map(c => ({id:c.name,label:c.name}))} value={form.category}
        onChange={category => onChange({...form,category})} disabled={busy || loadingCategories} />
      <ErrorText error={categoryError} />
      {!form.category && <Caption>Chọn một danh mục để có thể lưu sản phẩm.</Caption>}
      {!loadingCategories && !categories.length && !categoryError && <Caption>Vào tab Danh mục để thêm danh mục trước.</Caption>}
      {!!form.category && !loadingCategories && !categories.some(c => c.name === form.category) && <Caption>Danh mục đã thay đổi. Hãy chọn lại danh mục.</Caption>}
      {Object.entries(fields).map(([key, label]) => (
        <TextField
          key={key}
          label={label}
          value={form[key]}
          editable={!busy}
          multiline={key === "description"}
          keyboardType={
            ["price", "stock"].includes(key) ? "number-pad" : "default"
          }
          onChangeText={(value) => onChange({ ...form, [key]: value })}
        />
      ))}
      <Caption>Ảnh sản phẩm ({images.length}/10). Ảnh đầu tiên là ảnh bìa.</Caption>
      <View style={{flexDirection:"row",flexWrap:"wrap",gap:12}}>
        {images.map((url,index) => <View key={url} style={{width:180}}>
          <Image source={{uri:url}} style={{height:150,width:180,borderRadius:12}} resizeMode="contain" />
          <Caption>{index === 0 ? "Ảnh bìa" : `Ảnh ${index + 1}`}</Caption>
          {index > 0 && <PrimaryButton title="Đặt làm ảnh bìa" variant="secondary" disabled={busy} onPress={() => setImages([url,...images.filter((_,i) => i !== index)])} />}
          <PrimaryButton title="Bỏ ảnh" variant="secondary" disabled={busy} onPress={() => setImages(images.filter((_,i) => i !== index))} />
        </View>)}
      </View>
      <PrimaryButton
        title="Chọn nhiều ảnh sản phẩm"
        loading={uploading}
        disabled={busy || images.length >= 10}
        variant="secondary"
        onPress={chooseImage}
      />
      <ErrorText error={imageError} />
      {!!progress && <Caption>{progress}</Caption>}
      <Caption>Hiển thị sản phẩm trong cửa hàng</Caption>
      <Switch
        disabled={busy}
        value={form.isActive}
        onValueChange={(value) => onChange({ ...form, isActive: value })}
      />
      <PrimaryButton
        title="Lưu sản phẩm"
        loading={busy}
        disabled={uploading || loadingCategories || !categories.some(c => c.name === form.category)}
        onPress={onSave}
      />
      {editing && (
        <PrimaryButton
          title="Hủy chỉnh sửa"
          disabled={busy}
          variant="secondary"
          onPress={onCancel}
        />
      )}
    </Card>
  );
}
