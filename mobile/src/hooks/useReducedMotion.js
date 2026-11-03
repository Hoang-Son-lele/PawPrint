import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

let cached = false;
const listeners = new Set();
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((value) => {
    cached = !!value;
    listeners.forEach((fn) => fn(cached));
  })
  .catch(() => {});
AccessibilityInfo.addEventListener?.("reduceMotionChanged", (value) => {
  cached = !!value;
  listeners.forEach((fn) => fn(cached));
});

/** Tôn trọng cài đặt "Giảm chuyển động" của thiết bị. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(cached);
  useEffect(() => {
    listeners.add(setReduced);
    setReduced(cached);
    return () => listeners.delete(setReduced);
  }, []);
  return reduced;
}

export const isReducedMotion = () => cached;

