import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadWithProgress } from "./api";

async function buildForm(asset, fallbackName, extra = {}) {
  const form = new FormData();
  if (Platform.OS === "web")
    form.append("file", asset.file || (await (await fetch(asset.uri)).blob()), asset.fileName || fallbackName);
  else
    form.append("file", {
      uri: asset.uri,
      name: asset.fileName || fallbackName,
      type: asset.mimeType || "image/jpeg",
    });
  for (const [key, value] of Object.entries(extra)) form.append(key, value);
  return form;
}

export async function uploadProductImage(asset, onProgress) {
  return uploadWithProgress("/admin/product-image", await buildForm(asset, "product.jpg"), onProgress);
}
export async function uploadAvatar(asset, onProgress) {
  return uploadWithProgress("/profile/avatar", await buildForm(asset, "avatar.jpg"), onProgress);
}

export async function selectPhoto(camera = false, { square = false } = {}) {
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Hãy cho phép PawPrint dùng camera để chụp ảnh cho bé.");
  }
  const options = {
    mediaTypes: ["images"],
    quality: 0.85,
    allowsEditing: square && Platform.OS !== "web",
    ...(square ? { aspect: [1, 1] } : {}),
  };
  const result = await (camera
    ? ImagePicker.launchCameraAsync(options)
    : ImagePicker.launchImageLibraryAsync(options));
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.fileSize > 10 * 1024 * 1024) throw new Error("Ảnh tối đa 10 MB, hãy chọn ảnh nhỏ hơn.");
  return asset;
}

export async function selectProductPhotos(limit = 10) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    allowsEditing: false,
    allowsMultipleSelection: true,
    selectionLimit: limit,
  });
  if (result.canceled) return [];
  if (result.assets.length > limit) throw new Error(`Chỉ có thể thêm ${limit} ảnh nữa.`);
  if (result.assets.some((asset) => asset.fileSize > 10 * 1024 * 1024)) throw new Error("Mỗi ảnh tối đa 10 MB.");
  return result.assets;
}

export async function uploadMoment({ petId, asset, caption, date, requestKey }, onProgress) {
  const form = await buildForm(asset, "moment.jpg", { caption, occurredAt: date, requestKey });
  return uploadWithProgress(`/pets/${petId}/moments/photo`, form, onProgress);
}
