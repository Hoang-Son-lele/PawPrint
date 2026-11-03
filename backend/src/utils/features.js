const { HttpError } = require("./http");
const { isUuid } = require("./validation");
function uuid(value) {
  if (!isUuid(value)) throw new HttpError(400, "ID không hợp lệ.");
  return value;
}
function text(value, max, required = true) {
  if (value == null && !required) return null;
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  ) {
    throw new HttpError(400, "Nội dung trống hoặc quá dài.");
  }
  return value.trim();
}
function quantity(value) {
  if (!Number.isInteger(value) || value < 1 || value > 99)
    throw new HttpError(400, "Số lượng phải từ 1 đến 99.");
  return value;
}
function pagination(query) {
  const page = Number(query.page || 1),
    limit = Number(query.limit || 20);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new HttpError(400, "Phân trang không hợp lệ.");
  return { offset: (page - 1) * limit, limit, page };
}
module.exports = { uuid, text, quantity, pagination };
