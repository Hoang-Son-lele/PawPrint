import { Platform } from "react-native";

/**
 * PawPrint design tokens.
 * Xanh #073A83 = điều hướng / tiêu đề / nút chính / trạng thái chọn.
 * Vàng #FFAE34 = CTA nổi bật, huy hiệu, điểm thưởng cảm xúc.
 */
export const colors = {
  primary: "#073A83",
  primaryDark: "#052C64",
  primarySoft: "#E8F0FC",
  primaryTint: "#D3E2F8",
  accent: "#FFAE34",
  accentDark: "#E8941A",
  accentSoft: "#FFF3DE",
  background: "#FFFBF4", // kem rất nhạt
  backgroundAlt: "#F4F8FE", // xanh trắng nhạt
  surface: "#FFFFFF",
  surfaceMuted: "#F7F4EE",
  ink: "#0B2F66", // chữ chính – xanh đậm gần primary
  inkSoft: "#4F6584", // chữ phụ – xám xanh dễ đọc
  muted: "#7B8BA3",
  border: "#E9E3D8",
  borderCool: "#E2E9F3",
  success: "#1F8A5B",
  successSoft: "#E3F5EC",
  warning: "#B86E00",
  warningSoft: "#FFF1D6",
  danger: "#C23B3B",
  dangerSoft: "#FDECEC",
  info: "#2F6FD1",
  infoSoft: "#E6F0FD",
  pink: "#F06A93",
  pinkSoft: "#FDE8EF",
  mint: "#2BA58A",
  mintSoft: "#E1F5EF",
  lilac: "#7B61C9",
  lilacSoft: "#EFEAFB",
  overlay: "rgba(7, 26, 58, 0.48)",
  white: "#FFFFFF",
};

export const fonts = {
  regular: "Nunito_500Medium",
  medium: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  heavy: "Nunito_800ExtraBold",
  black: "Nunito_900Black",
};

export const type = {
  display: { fontFamily: fonts.black, fontSize: 32, lineHeight: 40, color: colors.ink },
  h1: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 34, color: colors.ink },
  h2: { fontFamily: fonts.heavy, fontSize: 21, lineHeight: 28, color: colors.ink },
  h3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.ink },
  bodySoft: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  label: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.ink },
  caption: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft },
  overline: {
    fontFamily: fonts.heavy,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.primary,
  },
  number: { fontFamily: fonts.black, fontSize: 28, lineHeight: 34, color: colors.ink },
};

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { xs: 10, sm: 14, md: 18, lg: 22, xl: 26, pill: 999 };
export const motion = { press: 110, fast: 160, normal: 240, slow: 360, stagger: 70 };
export const touch = { min: 44, comfortable: 52 };
export const layout = { maxContent: 760, maxWide: 1100 };

export const shadow = {
  soft: Platform.select({
    web: { boxShadow: "0 6px 20px rgba(7, 58, 131, 0.08)" },
    default: {
      shadowColor: "#0B2F66",
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
  }),
  lifted: Platform.select({
    web: { boxShadow: "0 12px 30px rgba(7, 58, 131, 0.16)" },
    default: {
      shadowColor: "#0B2F66",
      shadowOpacity: 0.16,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  }),
};

/* ---- Tương thích ngược với các màn hình cũ ---- */
export const palette = {
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  background: colors.background,
  surface: colors.surface,
  ink: colors.ink,
  muted: colors.inkSoft,
  border: colors.border,
  error: colors.danger,
  subtle: colors.primarySoft,
  peach: colors.accentSoft,
  gold: colors.accent,
};
export const typography = {
  regular: { fontFamily: fonts.regular },
  heading: { fontFamily: fonts.heavy },
};
