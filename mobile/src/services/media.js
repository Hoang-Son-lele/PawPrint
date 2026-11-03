import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "./api";
async function uploadImage(asset, path) {
  const form = new FormData();
  if (Platform.OS === "web")
    form.append(
      "file",
      asset.file || (await (await fetch(asset.uri)).blob()),
      asset.fileName || "product.jpg",
    );
  else
    form.append("file", {
      uri: asset.uri,
      name: asset.fileName || "product.jpg",
      type: asset.mimeType || "image/jpeg",
    });
  return api(path, { method: "POST", form });
}
export const uploadProductImage = asset => uploadImage(asset,"/admin/product-image");
export const uploadAvatar = asset => uploadImage(asset,"/profile/avatar");
export async function selectPhoto(camera = false) {
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error("Cho phép truy cập camera để chụp ảnh cho bé.");
  }
  const options = {
    mediaTypes: ["images"],
    quality: 0.85,
    allowsEditing: false,
  };
  const result = await (camera
    ? ImagePicker.launchCameraAsync(options)
    : ImagePicker.launchImageLibraryAsync(options));
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.fileSize > 10 * 1024 * 1024) throw new Error("Ảnh tối đa 10 MB.");
  return asset;
}
export async function selectProductPhotos(limit = 10) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"], quality: 0.85, allowsEditing: false,
    allowsMultipleSelection: true, selectionLimit: limit,
  });
  if (result.canceled) return [];
  if (result.assets.length > limit) throw new Error(`Chỉ có thể thêm ${limit} ảnh nữa.`);
  if (result.assets.some(asset => asset.fileSize > 10 * 1024 * 1024))
    throw new Error("Mỗi ảnh tối đa 10 MB.");
  return result.assets;
}
export async function uploadMoment({
  petId,
  asset,
  caption,
  date,
  requestKey,
}) {
  const form = new FormData();
  if (Platform.OS === "web")
    form.append(
      "file",
      asset.file || (await (await fetch(asset.uri)).blob()),
      asset.fileName || "moment.jpg",
    );
  else
    form.append("file", {
      uri: asset.uri,
      name: asset.fileName || "moment.jpg",
      type: asset.mimeType || "image/jpeg",
    });
  form.append("caption", caption);
  form.append("occurredAt", date);
  form.append("requestKey", requestKey);
  return api(`/pets/${petId}/moments/photo`, { method: "POST", form });
}
