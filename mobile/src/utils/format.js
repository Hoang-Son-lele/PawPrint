export const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;

export const statuses = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

const pad = (n) => String(n).padStart(2, "0");
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function today() {
  return toISODate(new Date());
}

/** "2026-11-03" | Date -> Date ở giờ địa phương (không lệch múi giờ). */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m && s.length <= 10) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const dateKey = (value) => {
  const d = parseDate(value);
  return d ? toISODate(d) : "";
};

const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
export const monthLabel = (m) => `Tháng ${MONTHS[m - 1] ?? m}`;
const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

/** 3 thg 11, 2026 */
export function formatDate(value, { weekday = false, year = true } = {}) {
  const d = parseDate(value);
  if (!d) return "—";
  const base = `${d.getDate()} thg ${d.getMonth() + 1}${year ? `, ${d.getFullYear()}` : ""}`;
  return weekday ? `${WEEKDAYS[d.getDay()]}, ${base}` : base;
}

/** Hôm nay / Hôm qua / 3 ngày trước / 3 thg 11 */
export function relativeDate(value) {
  const d = parseDate(value);
  if (!d) return "—";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((start - day) / 86400000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  if (diff > 1 && diff < 7) return `${diff} ngày trước`;
  return formatDate(d, { year: d.getFullYear() !== start.getFullYear() });
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return { text: "Khuya rồi", icon: "moon" };
  if (h < 11) return { text: "Chào buổi sáng", icon: "sunny" };
  if (h < 14) return { text: "Chào buổi trưa", icon: "partly-sunny" };
  if (h < 18) return { text: "Chào buổi chiều", icon: "cafe" };
  return { text: "Chào buổi tối", icon: "moon" };
}

export const speciesInfo = {
  dog: { label: "Chó", emoji: "🐶", tag: "Cún cưng" },
  cat: { label: "Mèo", emoji: "🐱", tag: "Mèo cưng" },
  other: { label: "Khác", emoji: "🐾", tag: "Thú cưng" },
};
export const species = (value) => speciesInfo[value] || speciesInfo.other;

export const sexLabel = { male: "Đực", female: "Cái", unknown: "Chưa rõ" };

export function ageText(birthDate) {
  const d = parseDate(birthDate);
  if (!d) return null;
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
  if (now.getDate() < d.getDate()) months -= 1;
  if (months < 0) return null;
  if (months < 1) return "Dưới 1 tháng";
  if (months < 12) return `${months} tháng tuổi`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} tuổi ${m} tháng` : `${y} tuổi`;
}

export function daysSince(value) {
  const d = parseDate(value);
  if (!d) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((start - d) / 86400000);
}

export const careKinds = {
  weight: { label: "Cân nặng", icon: "scale-bathroom", color: "#2F6FD1", soft: "#E6F0FD" },
  bath: { label: "Tắm", icon: "shower-head", color: "#2BA58A", soft: "#E1F5EF" },
  nails: { label: "Cắt móng", icon: "content-cut", color: "#7B61C9", soft: "#EFEAFB" },
  vet: { label: "Khám thú y", icon: "stethoscope", color: "#C23B3B", soft: "#FDECEC" },
  note: { label: "Ghi chú", icon: "note-text-outline", color: "#B86E00", soft: "#FFF1D6" },
};

/** Bỏ dấu tiếng Việt để tìm kiếm không dấu. */
export const normalize = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
