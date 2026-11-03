import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Xác định địa chỉ Backend:
 * 1. EXPO_PUBLIC_API_URL nếu được đặt rõ ràng (trừ 10.0.2.2 – chỉ dành cho Android Emulator).
 * 2. Web: cùng hostname với trang đang mở, cổng 3000.
 * 3. Expo Go: lấy IP máy tính đang chạy Metro (hostUri) – điện thoại thật cùng Wi-Fi gọi được ngay.
 */
function resolveApiUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl && !envUrl.includes("10.0.2.2")) return envUrl.replace(/\/$/, "");
  if (Platform.OS === "web") {
    const host = typeof window !== "undefined" ? window.location?.hostname : "";
    return `http://${host || "localhost"}:3000/api`;
  }
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;
  const ip = hostUri?.split(":")[0];
  if (ip && !["localhost", "127.0.0.1"].includes(ip)) return `http://${ip}:3000/api`;
  return envUrl || "http://10.0.2.2:3000/api";
}

export const API_URL = resolveApiUrl();

const TOKEN_KEY = "pawprint_access_token";
const REFRESH_KEY = "pawprint_refresh_token";

function makeStore(key) {
  return {
    get: async () =>
      Platform.OS === "web" ? sessionStorage.getItem(key) : SecureStore.getItemAsync(key),
    set: async (value) => {
      if (Platform.OS === "web") sessionStorage.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    },
    clear: async () => {
      if (Platform.OS === "web") sessionStorage.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    },
  };
}
export const tokenStore = makeStore(TOKEN_KEY);
export const refreshStore = makeStore(REFRESH_KEY);

let refreshing;
async function refreshSession() {
  if (!refreshing)
    refreshing = (async () => {
      const refreshToken = await refreshStore.get();
      if (!refreshToken) {
        const e = new Error("Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.");
        e.status = 401;
        throw e;
      }
      try {
        const r = await api("/auth/refresh", { method: "POST", token: null, body: { refreshToken } });
        await refreshStore.set(r.refreshToken);
        await tokenStore.set(r.token);
      } catch (e) {
        if (e.status === 401) {
          await tokenStore.clear();
          await refreshStore.clear();
        }
        throw e;
      }
    })().finally(() => {
      refreshing = undefined;
    });
  return refreshing;
}

/** Lỗi mạng có thể thử lại; lỗi dữ liệu (4xx) cần người dùng chỉnh lại. */
function networkError(kind) {
  const e = new Error(
    kind === "timeout"
      ? "Máy chủ phản hồi quá lâu. Kiểm tra Backend đang chạy và điện thoại cùng Wi-Fi với máy tính, rồi thử lại."
      : "Không kết nối được tới PawPrint. Kiểm tra mạng hoặc Backend, rồi thử lại.",
  );
  e.network = true;
  e.retryable = true;
  return e;
}

export async function api(path, { method = "GET", body, form, token, _retry = false, ...options } = {}) {
  const accessToken = token === undefined ? await tokenStore.get() : token;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), form ? 90000 : 15000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !form ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      ...(form ? { body: form } : body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...options,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && token === undefined && !_retry && !path.startsWith("/auth/refresh")) {
      if ((await tokenStore.get()) === accessToken) await refreshSession();
      return api(path, { method, body, form, ...options, _retry: true });
    }
    if (!response.ok) {
      const error = new Error(payload.message || `Yêu cầu thất bại (${response.status})`);
      error.status = response.status;
      error.retryable = response.status >= 500;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === "AbortError") throw networkError("timeout");
    if (error.message === "Network request failed" || error instanceof TypeError) throw networkError();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Upload multipart có báo tiến trình thật (0 → 1) qua XMLHttpRequest. */
export async function uploadWithProgress(path, form, onProgress = () => {}, _retry = false) {
  const accessToken = await tokenStore.get();
  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}${path}`);
    xhr.setRequestHeader("Accept", "application/json");
    if (accessToken) xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.timeout = 90000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total) onProgress(Math.min(0.98, event.loaded / event.total));
    };
    xhr.onload = () => {
      let payload = {};
      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch {
        /* giữ payload rỗng */
      }
      resolve({ status: xhr.status, payload });
    };
    xhr.onerror = () => reject(networkError());
    xhr.ontimeout = () => reject(networkError("timeout"));
    xhr.send(form);
  });
  if (result.status === 401 && !_retry) {
    await refreshSession();
    return uploadWithProgress(path, form, onProgress, true);
  }
  if (result.status < 200 || result.status >= 300) {
    const error = new Error(result.payload.message || `Tải lên thất bại (${result.status})`);
    error.status = result.status;
    error.retryable = result.status >= 500;
    throw error;
  }
  onProgress(1);
  return result.payload;
}
