import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "web"
    ? "http://localhost:3000/api"
    : "http://10.0.2.2:3000/api");

const TOKEN_KEY = "pawprint_access_token";
const REFRESH_KEY = "pawprint_refresh_token";
export const refreshStore = {
  get: async () =>
    Platform.OS === "web"
      ? sessionStorage.getItem(REFRESH_KEY)
      : SecureStore.getItemAsync(REFRESH_KEY),
  set: async (value) => {
    if (Platform.OS === "web") sessionStorage.setItem(REFRESH_KEY, value);
    else await SecureStore.setItemAsync(REFRESH_KEY, value);
  },
  clear: async () => {
    if (Platform.OS === "web") sessionStorage.removeItem(REFRESH_KEY);
    else await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
let refreshing;
async function refreshSession() {
  if (!refreshing)
    refreshing = (async () => {
      const refreshToken = await refreshStore.get();
      if (!refreshToken) {
        const e = new Error("Vui lòng đăng nhập lại.");
        e.status = 401;
        throw e;
      }
      try {
        const r = await api("/auth/refresh", {
          method: "POST",
          token: null,
          body: { refreshToken },
        });
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

// Lưu JWT token tương ứng với nền tảng
export const tokenStore = {
  get: async () => {
    if (Platform.OS === "web") {
      return sessionStorage.getItem(TOKEN_KEY);
    }

    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  set: async (token) => {
    if (Platform.OS === "web") {
      sessionStorage.setItem(TOKEN_KEY, token);
      return;
    }

    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  clear: async () => {
    if (Platform.OS === "web") {
      sessionStorage.removeItem(TOKEN_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

// Gọi API Backend
export async function api(
  path,
  { method = "GET", body, form, token, _retry = false, ...options } = {},
) {
  const accessToken = token === undefined ? await tokenStore.get() : token;

  const controller = new AbortController();

  const timeout = setTimeout(
    () => {
      controller.abort();
    },
    form ? 90000 : 15000,
  );

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !form
          ? { "Content-Type": "application/json" }
          : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      ...(form
        ? { body: form }
        : body !== undefined
          ? { body: JSON.stringify(body) }
          : {}),
      ...options,
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (
      response.status === 401 &&
      token === undefined &&
      !_retry &&
      !path.startsWith("/auth/refresh")
    ) {
      if ((await tokenStore.get()) === accessToken) await refreshSession();
      return api(path, { method, body, form, ...options, _retry: true });
    }

    if (!response.ok) {
      const error = new Error(
        payload.message || `Yêu cầu thất bại (${response.status})`,
      );

      error.status = response.status;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Kết nối API bị quá thời gian.");
    }

    if (
      error.message === "Network request failed" ||
      error instanceof TypeError
    ) {
      throw new Error("Không kết nối được API. Kiểm tra địa chỉ Backend.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
