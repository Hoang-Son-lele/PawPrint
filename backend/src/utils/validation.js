const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isUuid(value) {
  return typeof value === "string" && UUID.test(value);
}
function isDate(value) {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() + 1 === month &&
    d.getUTCDate() === day
  );
}
function trimOrNull(value, maxLength = 255) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const result = value.trim();
  if (result.length > maxLength) return undefined;
  return result || null;
}
function isEmail(value) {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}
module.exports = { isUuid, isDate, trimOrNull, isEmail };
