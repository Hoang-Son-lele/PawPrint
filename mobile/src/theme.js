import { Platform } from "react-native";
export const typography = {
  regular: {
    fontFamily:
      Platform.OS === "ios"
        ? "System"
        : Platform.OS === "android"
          ? "sans-serif"
          : "system-ui",
    fontWeight: "400",
  },
  heading: {
    fontFamily:
      Platform.OS === "ios"
        ? "System"
        : Platform.OS === "android"
          ? "sans-serif"
          : "system-ui",
    fontWeight: "700",
  },
};
export const palette = {
  primary: "#2459A6",
  primaryDark: "#173F7A",
  background: "#FFFBEA",
  surface: "#FFFFFF",
  ink: "#183B70",
  muted: "#7183A0",
  border: "#DCE4EF",
  error: "#B43636",
  subtle: "#EAF1FC",
  peach: "#FFF0D5",
  gold: "#FFB52E",
};
