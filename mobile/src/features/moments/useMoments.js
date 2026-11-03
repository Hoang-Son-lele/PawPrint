import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "../../services/api";
export default function useMoments(petId) {
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false);
  const generation = useRef(0);
  const load = useCallback(
    async (next = 1) => {
      if (!petId) return;
      const current = ++generation.current;
      setLoading(true);
      setError("");
      try {
        const r = await api(`/pets/${petId}/moments?page=${next}`);
        if (current === generation.current) {
          setItems((old) => (next === 1 ? r.items : [...old, ...r.items]));
          setPage(next);
          setMore(r.hasMore);
        }
      } catch (e) {
        if (current === generation.current) setError(e.message);
      } finally {
        if (current === generation.current) setLoading(false);
      }
    },
    [petId],
  );
  useFocusEffect(
    useCallback(() => {
      setItems([]);
      setMore(false);
      load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  return {
    items,
    error,
    setError,
    loading,
    more,
    load,
    next: () => load(page + 1),
  };
}
