import { useEffect, useState } from "react";
import { api } from "../../services/api";

/** Store nhỏ cho số lượng sản phẩm trong giỏ – hiển thị huy hiệu trên biểu tượng giỏ. */
let count = 0;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn(count));

export const cartStore = {
  set(items) {
    count = Array.isArray(items) ? items.reduce((s, x) => s + Number(x.quantity || 0), 0) : Number(items) || 0;
    emit();
  },
  async refresh() {
    try {
      const r = await api("/shop/cart");
      cartStore.set(r.items);
      return r;
    } catch {
      return null;
    }
  },
};

export function useCartCount() {
  const [value, setValue] = useState(count);
  useEffect(() => {
    subs.add(setValue);
    return () => subs.delete(setValue);
  }, []);
  return value;
}

