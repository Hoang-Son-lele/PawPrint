const { sql } = require("../config/db");
const { HttpError } = require("../utils/http");
const { text } = require("../utils/features");
const { isDate } = require("../utils/validation");
const definitions = {
  moments: {
    table: "Moments",
    columns: "r.Caption AS caption",
    deleted: "AND r.DeletedAt IS NULL",
  },
  "care-records": {
    table: "CareRecords",
    columns:
      "r.Type AS type,r.ValueDecimal AS valueDecimal,r.Unit AS unit,r.Note AS note",
    deleted: "",
  },
};
function data(body, kind) {
  if (!body || !isDate(body.occurredAt))
    throw new HttpError(400, "Ngày ghi nhận phải là YYYY-MM-DD.");
  if (kind === "moments")
    return {
      caption: text(body.caption || "", 1000, false),
      occurredAt: body.occurredAt,
    };
  if (!["weight", "bath", "nails", "vet", "note"].includes(body.type))
    throw new HttpError(400, "Loại chăm sóc không hợp lệ.");
  const value = body.type === "weight" ? body.valueDecimal : null;
  if (
    body.type === "weight" &&
    (typeof value !== "number" ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 9999.99)
  )
    throw new HttpError(
      400,
      "Cân nặng phải lớn hơn 0 và không quá 9999.99 kg.",
    );
  return {
    type: body.type,
    value,
    unit: body.type === "weight" ? "kg" : null,
    note: text(body.note || "", 1000, false),
    occurredAt: body.occurredAt,
  };
}
function bind(request, fields) {
  const types = {
    caption: sql.NVarChar(1000),
    occurredAt: sql.DateTime2,
    type: sql.NVarChar(40),
    value: sql.Decimal(10, 2),
    unit: sql.NVarChar(20),
    note: sql.NVarChar(1000),
  };
  for (const [key, value] of Object.entries(fields))
    request.input(key, types[key], value);
  return request;
}
async function ownedPet(request) {
  if (
    !(
      await request.query(
        "SELECT Id FROM dbo.Pets WHERE Id=@pet AND UserId=@user AND DeletedAt IS NULL",
      )
    ).recordset[0]
  )
    throw new HttpError(404, "Không tìm thấy thú cưng.");
}
module.exports = { definitions, data, bind, ownedPet };
