import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, tokenStore, refreshStore } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const refreshUser = useCallback(async () => {
    const r = await api("/auth/me");
    setUser(r.user);
    return r.user;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await tokenStore.get();
        if (token) {
          const response = await api("/auth/me");
          if (mounted) setUser(response.user);
        }
      } catch (error) {
        if (error.status === 401) await tokenStore.clear();
        console.log("[Auth restore]", error.message);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const response = await api("/auth/login", {
      method: "POST",
      body: { email, password },
      token: null,
    });
    await tokenStore.set(response.token);
    await refreshStore.set(response.refreshToken);
    setUser(response.user);
  }, []);

  const signUp = useCallback(async (displayName, email, password) => {
    const response = await api("/auth/register", {
      method: "POST",
      body: { displayName, email, password, timeZone: "Asia/Ho_Chi_Minh" },
      token: null,
    });
    await tokenStore.set(response.token);
    await refreshStore.set(response.refreshToken);
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      const refreshToken = await refreshStore.get();
      if (refreshToken)
        await api("/auth/logout", {
          method: "POST",
          token: null,
          body: { refreshToken },
        });
    } catch {
      /* Clear this device even when the network is unavailable. */
    }
    await refreshStore.clear();
    await tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, signUp, signOut, refreshUser }),
    [user, ready, signIn, signUp, signOut, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải nằm trong AuthProvider");
  return context;
}
