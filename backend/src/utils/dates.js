// Tính chênh lệch ngày theo lịch (không bị sai do giờ mùa hè / múi giờ).
function todayInTimeZone(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type) => parts.find((p) => p.type === type).value;
  return `${read("year")}-${read("month")}-${read("day")}`;
}
function dateOrdinal(yyyyMMdd) {
  const [year, month, day] = yyyyMMdd.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}
function daysSince(dateString, timeZone, now = new Date()) {
  return dateOrdinal(todayInTimeZone(timeZone, now)) - dateOrdinal(dateString);
}
function isValidTimeZone(zone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
module.exports = { todayInTimeZone, daysSince, isValidTimeZone };
