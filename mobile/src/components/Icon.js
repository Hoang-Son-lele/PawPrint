import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme";

/**
 * Icon thống nhất. Tên có tiền tố "mc:" dùng MaterialCommunityIcons (có xương, dấu chân…),
 * còn lại dùng Ionicons.
 */
export default function Icon({ name, size = 22, color = colors.ink, style }) {
  if (name?.startsWith("mc:"))
    return <MaterialCommunityIcons name={name.slice(3)} size={size} color={color} style={style} />;
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

