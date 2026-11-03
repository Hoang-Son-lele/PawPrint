const { randomUUID } = require("node:crypto");
const { sql, getPool } = require("../config/db");
const { HttpError, asyncHandler } = require("../utils/http");
const { isUuid, isDate, trimOrNull } = require("../utils/validation");
const { daysSince, isValidTimeZone } = require("../utils/dates");
const { productImages } = require("../utils/product-images");

const PET_COLUMNS = `CONVERT(varchar(36), Id) AS id,
  Name AS name, Species AS species, Breed AS breed, Sex AS sex,
  CONVERT(varchar(10), BirthDate, 23) AS birthDate,
  CONVERT(varchar(10), AdoptedAt, 23) AS adoptedAt,
  WeightKg AS weightKg, Notes AS notes, AvatarUrl AS avatarUrl,
  CreatedAt AS createdAt`;

function assertUuid(id) {
  if (!isUuid(id)) throw new HttpError(400, "Pet ID không hợp lệ.");
}

function validatePet(body, isPatch = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Dữ liệu thú cưng không hợp lệ.");
  }
  const fields = [
    "name",
    "species",
    "breed",
    "sex",
    "birthDate",
    "adoptedAt",
    "weightKg",
    "notes",
    "avatarUrl",
  ];
  if (
    isPatch &&
    !fields.some((key) => Object.prototype.hasOwnProperty.call(body, key))
  ) {
    throw new HttpError(400, "Cần cung cấp ít nhất một trường để sửa.");
  }
  const result = {};
  for (const key of fields) {
    if (isPatch && !Object.prototype.hasOwnProperty.call(body, key)) continue;
    const value = body[key];
    if (key === "name") {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.trim().length > 100
      ) {
        throw new HttpError(400, "Tên thú cưng cần có 1–100 ký tự.");
      }
      result.name = value.trim();
    } else if (key === "species") {
      if (!["dog", "cat", "other"].includes(value))
        throw new HttpError(400, "Loài chỉ nhận dog, cat hoặc other.");
      result.species = value;
    } else if (["birthDate", "adoptedAt"].includes(key)) {
      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        !isDate(value)
      ) {
        throw new HttpError(400, `${key} phải có định dạng YYYY-MM-DD.`);
      }
      result[key] = value || null;
    } else if (key === "weightKg") {
      if (
        value !== null &&
        value !== undefined &&
        (typeof value !== "number" ||
          !Number.isFinite(value) ||
          value <= 0 ||
          value > 9999.99)
      ) {
        throw new HttpError(400, "Cân nặng không hợp lệ.");
      }
      result.weightKg = value ?? null;
    } else if (key === "sex") {
      if (![null, undefined, "", "male", "female", "unknown"].includes(value)) {
        throw new HttpError(400, "Giới tính không hợp lệ.");
      }
      result.sex = value || null;
    } else {
      const limit = key === "notes" ? 1000 : key === "avatarUrl" ? 500 : 120;
      const text = trimOrNull(value, limit);
      if (text === undefined)
        throw new HttpError(400, `${key} không hợp lệ hoặc quá dài.`);
      if (key === "avatarUrl" && text) productImages({imageUrls:[text]});
      result[key] = text;
    }
  }
  // Tránh mất dữ liệu: không cho phép giá trị rỗng của name/species trong tạo mới.
  return result;
}

function bindPet(request, body) {
  const columns = {
    name: ["Name", sql.NVarChar(100)],
    species: ["Species", sql.NVarChar(20)],
    breed: ["Breed", sql.NVarChar(120)],
    sex: ["Sex", sql.NVarChar(20)],
    birthDate: ["BirthDate", sql.Date],
    adoptedAt: ["AdoptedAt", sql.Date],
    weightKg: ["WeightKg", sql.Decimal(7, 2)],
    notes: ["Notes", sql.NVarChar(1000)],
    avatarUrl: ["AvatarUrl", sql.NVarChar(500)],
  };
  for (const [key, value] of Object.entries(body))
    request.input(key, columns[key][1], value);
  return columns;
}

async function getOwnedPet(id, userId) {
  const pool = await getPool();
  const response = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("userId", sql.UniqueIdentifier, userId)
    .query(`SELECT ${PET_COLUMNS} FROM dbo.Pets
      WHERE Id = @id AND UserId = @userId AND DeletedAt IS NULL`);
  if (!response.recordset[0])
    throw new HttpError(404, "Không tìm thấy thú cưng.");
  return response.recordset[0];
}

const listPets = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("userId", sql.UniqueIdentifier, req.userId)
    .query(`SELECT ${PET_COLUMNS} FROM dbo.Pets
      WHERE UserId = @userId AND DeletedAt IS NULL ORDER BY CreatedAt DESC`);
  res.json({ items: result.recordset });
});

const createPet = asyncHandler(async (req, res) => {
  const body = validatePet(req.body);
  await validateAdoptedAt(body, req.userId);
  const id = randomUUID();
  const pool = await getPool();
  const request = pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("userId", sql.UniqueIdentifier, req.userId);
  bindPet(request, body);
  await request.query(`INSERT INTO dbo.Pets (Id, UserId, Name, Species, Breed, Sex,
    BirthDate, AdoptedAt, WeightKg, Notes, AvatarUrl)
    VALUES (@id, @userId, @name, @species, @breed, @sex,
    @birthDate, @adoptedAt, @weightKg, @notes, @avatarUrl)`);
  res.status(201).json({ pet: await getOwnedPet(id, req.userId) });
});

const getPet = asyncHandler(async (req, res) => {
  assertUuid(req.params.id);
  res.json({ pet: await getOwnedPet(req.params.id, req.userId) });
});

const updatePet = asyncHandler(async (req, res) => {
  assertUuid(req.params.id);
  const body = validatePet(req.body, true);
  await validateAdoptedAt(body, req.userId);
  const pool = await getPool();
  const request = pool
    .request()
    .input("id", sql.UniqueIdentifier, req.params.id)
    .input("userId", sql.UniqueIdentifier, req.userId);
  const columns = bindPet(request, body);
  const sets = Object.keys(body).map((key) => `${columns[key][0]} = @${key}`);
  sets.push("UpdatedAt = SYSUTCDATETIME()");
  // Tên cột chỉ lấy từ whitelist cố định; giá trị đều bind bằng tham số.
  const result = await request.query(`UPDATE dbo.Pets SET ${sets.join(", ")}
    WHERE Id = @id AND UserId = @userId AND DeletedAt IS NULL`);
  if (result.rowsAffected[0] === 0)
    throw new HttpError(404, "Không tìm thấy thú cưng.");
  res.json({ pet: await getOwnedPet(req.params.id, req.userId) });
});

const deletePet = asyncHandler(async (req, res) => {
  assertUuid(req.params.id);
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, req.params.id)
    .input("userId", sql.UniqueIdentifier, req.userId)
    .query(`UPDATE dbo.Pets SET DeletedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @id AND UserId = @userId AND DeletedAt IS NULL`);
  if (result.rowsAffected[0] === 0)
    throw new HttpError(404, "Không tìm thấy thú cưng.");
  res.json({ message: "Đã ẩn hồ sơ thú cưng (soft delete)." });
});

const getTogetherDays = asyncHandler(async (req, res) => {
  assertUuid(req.params.id);
  const pet = await getOwnedPet(req.params.id, req.userId);
  if (!pet.adoptedAt)
    return res.json({
      petId: pet.id,
      adoptedAt: null,
      days: null,
      nextMilestone: null,
    });
  const pool = await getPool();
  const userResult = await pool
    .request()
    .input("id", sql.UniqueIdentifier, req.userId)
    .query("SELECT TimeZone AS timeZone FROM dbo.Users WHERE Id = @id");
  const zone = userResult.recordset[0]?.timeZone || "Asia/Ho_Chi_Minh";
  if (!isValidTimeZone(zone))
    throw new HttpError(400, "Múi giờ tài khoản không hợp lệ.");
  const days = daysSince(pet.adoptedAt, zone);
  if (days < 0)
    throw new HttpError(
      400,
      "Ngày đón về chưa đến, chưa thể tính số ngày đồng hành.",
    );
  const nextMilestone =
    [100, 365, 1000].find((target) => target > days) ?? null;
  // HOLDLOCK keeps concurrent reads from inserting the same anniversary twice.
  await pool
    .request()
    .input("pet", sql.UniqueIdentifier, pet.id)
    .input("adopted", sql.Date, pet.adoptedAt)
    .input("days", sql.Int, days).query(`SET XACT_ABORT ON; BEGIN TRAN;
      INSERT dbo.Milestones(Id,PetId,Type,MilestoneDate,Title)
      SELECT NEWID(),@pet,CONCAT('together_',v.days),DATEADD(day,v.days,@adopted),CONCAT(v.days,N' ngày bên nhau')
      FROM (VALUES(100),(365),(1000)) v(days) WHERE v.days<=@days
      AND NOT EXISTS(SELECT 1 FROM dbo.Milestones WITH(UPDLOCK,HOLDLOCK) WHERE PetId=@pet AND Type=CONCAT('together_',v.days) AND MilestoneDate=DATEADD(day,v.days,@adopted));
      COMMIT;`);
  res.json({
    petId: pet.id,
    adoptedAt: pet.adoptedAt,
    days,
    timeZone: zone,
    nextMilestone: nextMilestone
      ? { days: nextMilestone, remaining: nextMilestone - days }
      : null,
  });
});

async function validateAdoptedAt(body, userId) {
  if (!body.adoptedAt) return;
  const pool = await getPool();
  const row = (
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, userId)
      .query("SELECT TimeZone AS timeZone FROM dbo.Users WHERE Id=@id")
  ).recordset[0];
  const zone = row?.timeZone || "Asia/Ho_Chi_Minh";
  if (!isValidTimeZone(zone) || daysSince(body.adoptedAt, zone) < 0)
    throw new HttpError(400, "Ngày đón về không được nằm trong tương lai.");
}
module.exports = {
  listPets,
  createPet,
  getPet,
  updatePet,
  deletePet,
  getTogetherDays,
};
