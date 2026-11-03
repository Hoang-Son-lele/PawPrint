import React from "react";
import SmartImage from "./SmartImage";

/** Ảnh đại diện tròn; khi chưa có ảnh hiển thị chữ cái đầu. */
export default function Avatar({ uri, label = "?", size = 64, ring = false }) {
  const initials =
    String(label || "?")
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .slice(0, 2) || "?";
  return (
    <SmartImage
      uri={uri}
      label={`Ảnh đại diện ${label}`}
      fallback={initials}
      style={[
        { width: size, height: size, borderRadius: size / 2 },
        ring && { borderWidth: 3, borderColor: "#FFFFFF" },
      ]}
    />
  );
}
