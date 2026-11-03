import * as Crypto from "expo-crypto";
import { api } from "./api";

export function trackView(productId = null) {
  // Analytics must never block browsing. Staff previews are excluded by the API.
  return api("/shop/traffic", {
    method: "POST", body: { eventId: Crypto.randomUUID(), productId },
  }).catch(() => {});
}
