const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, getPool } = require("../config/db");
const env = require("../config/env");
const { HttpError, asyncHandler } = require("../utils/http");
const { isEmail, trimOrNull } = require("../utils/validation");
const { isValidTimeZone } = require("../utils/dates");
const {
  createSession,
  rotateSession,
  revokeSession,
} = require("../utils/sessions");

const selectUser = `SELECT CONVERT(varchar(36), Id) AS id, Email AS email,
  DisplayName AS displayName, AvatarUrl AS avatarUrl, TimeZone AS timeZone, Role AS role
  FROM dbo.Users WHERE Id = @id AND IsActive=1`;

function createToken(user) {
  return jwt.sign({ sub: user.id }, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: env.jwtExpiresIn,
  });
}

const register = asyncHandler(async (req, res) => {
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password = req.body.password;
  const displayName = trimOrNull(req.body.displayName, 100);
  const timeZone = req.body.timeZone || "Asia/Ho_Chi_Minh";
  if (!isEmail(email)) throw new HttpError(400, "Email không hợp lệ.");
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 72
  ) {
    throw new HttpError(400, "Mật khẩu cần có từ 8 đến 72 ký tự.");
  }
  if (displayName === undefined)
    throw new HttpError(400, "Tên hiển thị quá dài hoặc không hợp lệ.");
  if (typeof timeZone !== "string" || !isValidTimeZone(timeZone)) {
    throw new HttpError(400, "Múi giờ không hợp lệ.");
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const pool = await getPool();
  try {
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("email", sql.NVarChar(254), email)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .input("displayName", sql.NVarChar(100), displayName)
      .input("timeZone", sql.NVarChar(80), timeZone)
      .query(`INSERT INTO dbo.Users (Id, Email, PasswordHash, DisplayName, TimeZone)
        VALUES (@id, @email, @passwordHash, @displayName, @timeZone)`);
  } catch (error) {
    if (
      [2601, 2627].includes(error.number) ||
      [2601, 2627].includes(error.originalError?.info?.number)
    ) {
      throw new HttpError(409, "Email này đã được đăng ký.");
    }
    throw error;
  }
  const user = { id, email, displayName, timeZone, role: "owner", avatarUrl: null };
  res
    .status(201)
    .json({
      user,
      token: createToken(user),
      refreshToken: await createSession(user.id),
    });
});

const login = asyncHandler(async (req, res) => {
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
  const password = req.body.password;
  if (!isEmail(email) || typeof password !== "string") {
    throw new HttpError(400, "Vui lòng nhập email và mật khẩu hợp lệ.");
  }
  const pool = await getPool();
  const result = await pool.request().input("email", sql.NVarChar(254), email)
    .query(`SELECT CONVERT(varchar(36), Id) AS id, Email AS email,
      PasswordHash AS passwordHash, DisplayName AS displayName, AvatarUrl AS avatarUrl, TimeZone AS timeZone, Role AS role
      FROM dbo.Users WHERE Email = @email AND IsActive=1`);
  const record = result.recordset[0];
  if (!record || !(await bcrypt.compare(password, record.passwordHash))) {
    throw new HttpError(401, "Email hoặc mật khẩu không đúng.");
  }
  const { passwordHash, ...user } = record;
  res.json({
    user,
    token: createToken(user),
    refreshToken: await createSession(user.id),
  });
});

const me = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, req.userId)
    .query(selectUser);
  if (!result.recordset[0])
    throw new HttpError(401, "Tài khoản không tồn tại.");
  res.json({ user: result.recordset[0] });
});

const refresh = asyncHandler(async (req, res) => {
  const session = await rotateSession(req.body?.refreshToken);
  const pool = await getPool();
  const user = (
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, session.userId)
      .query(selectUser)
  ).recordset[0];
  if (!user) throw new HttpError(401, "Tài khoản không tồn tại.");
  res.json({
    user,
    token: createToken(user),
    refreshToken: session.refreshToken,
  });
});
const logout = asyncHandler(async (req, res) => {
  await revokeSession(req.body?.refreshToken);
  res.json({ message: "Đã thu hồi phiên đăng nhập." });
});
module.exports = { register, login, me, refresh, logout };
