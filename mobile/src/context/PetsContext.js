import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";

const PetsContext = createContext(null);

/**
 * Danh sách thú cưng dùng chung giữa các tab, để thay đổi ở một nơi
 * (tạo / sửa / xóa) cập nhật ngay ở Trang chủ, Khoảnh khắc, Chăm sóc…
 */
export function PetsProvider({ children }) {
  const { user } = useAuth();
  const [pets, setPets] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState("");
  const [activePetId, setActivePetId] = useState("");
  const inflight = useRef(null);

  const load = useCallback(async () => {
    if (inflight.current) return inflight.current;
    setError("");
    setStatus((s) => (s === "ready" ? "ready" : "loading"));
    inflight.current = api("/pets")
      .then((r) => {
        setPets(r.items);
        setStatus("ready");
        setActivePetId((id) => (r.items.some((p) => p.id === id) ? id : r.items[0]?.id || ""));
        return r.items;
      })
      .catch((e) => {
        setError(e.message);
        setStatus((s) => (s === "ready" ? "ready" : "error"));
        throw e;
      })
      .finally(() => {
        inflight.current = null;
      });
    return inflight.current;
  }, []);

  useEffect(() => {
    if (user?.role === "owner") load().catch(() => {});
    else {
      setPets([]);
      setStatus("idle");
    }
  }, [user?.id, user?.role, load]);

  const upsert = useCallback((pet) => {
    setPets((list) => {
      const exists = list.some((p) => p.id === pet.id);
      return exists ? list.map((p) => (p.id === pet.id ? { ...p, ...pet } : p)) : [pet, ...list];
    });
  }, []);
  const remove = useCallback((id) => {
    setPets((list) => list.filter((p) => p.id !== id));
    setActivePetId((cur) => (cur === id ? "" : cur));
  }, []);

  const value = useMemo(
    () => ({ pets, status, error, load, upsert, remove, activePetId, setActivePetId, getPet: (id) => pets.find((p) => p.id === id) }),
    [pets, status, error, load, upsert, remove, activePetId],
  );
  return <PetsContext.Provider value={value}>{children}</PetsContext.Provider>;
}

export function usePets() {
  const ctx = useContext(PetsContext);
  if (!ctx) throw new Error("usePets phải nằm trong PetsProvider");
  return ctx;
}

