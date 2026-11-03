import { useCallback, useRef, useState } from "react";
import { api } from "../../services/api";

/**
 * Tải khoảnh khắc theo một bé hoặc "all" (gộp nhiều bé, sắp xếp theo ngày).
 * status: loading | ready | error
 */
export default function useMoments(petId, pets) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const generation = useRef(0);
  const countRef = useRef(0);
  countRef.current = items.length;

  const fetchPage = useCallback(
    async (next) => {
      const targets = petId === "all" ? pets : pets.filter((p) => p.id === petId);
      const results = await Promise.all(
        targets.map((p) =>
          api(`/pets/${p.id}/moments?page=${next}&limit=12`).then((r) => ({ items: r.items.map((m) => ({ ...m, pet: p })), hasMore: r.hasMore })),
        ),
      );
      return {
        items: results.flatMap((r) => r.items).sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)) || String(b.id).localeCompare(String(a.id))),
        hasMore: results.some((r) => r.hasMore),
      };
    },
    [petId, pets],
  );

  const load = useCallback(
    async (next = 1) => {
      if (!petId || !pets.length) {
        setItems([]);
        setStatus("ready");
        return;
      }
      const current = ++generation.current;
      if (next === 1) setStatus((s) => (s === "ready" && countRef.current ? "ready" : "loading"));
      else setLoadingMore(true);
      setError("");
      try {
        const r = await fetchPage(next);
        if (current !== generation.current) return;
        setItems((old) => {
          if (next === 1) return r.items;
          const seen = new Set(old.map((m) => m.id));
          return [...old, ...r.items.filter((m) => !seen.has(m.id))];
        });
        setPage(next);
        setMore(r.hasMore);
        setStatus("ready");
      } catch (e) {
        if (current !== generation.current) return;
        setError(e.message);
        setStatus((s) => (next === 1 && !countRef.current ? "error" : s === "loading" ? "error" : s));
      } finally {
        if (current === generation.current) setLoadingMore(false);
      }
    },
    [petId, pets, fetchPage],
  );

  return {
    items,
    setItems,
    status,
    error,
    more,
    loadingMore,
    load,
    next: () => !loadingMore && more && load(page + 1),
    reset: () => {
      generation.current++;
      setItems([]);
      setStatus("loading");
    },
  };
}
