const { randomBytes, createHash } = require("node:crypto");
const { sql, getPool } = require("../config/db");
const { HttpError } = require("./http");
const hash = (token) => createHash("sha256").update(token).digest("hex");
function validToken(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new HttpError(401, "Phiên đăng nhập không hợp lệ.");
  return token;
}
async function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const pool = await getPool();
  await pool
    .request()
    .input("hash", sql.Char(64), hash(token))
    .input("user", sql.UniqueIdentifier, userId)
    .query(
      "INSERT dbo.RefreshSessions(TokenHash,UserId,ExpiresAt) VALUES(@hash,@user,DATEADD(day,30,SYSUTCDATETIME()))",
    );
  return token;
}
async function rotateSession(token) {
  validToken(token);
  const next = randomBytes(32).toString("base64url");
  const pool = await getPool();
  const result = await pool
    .request()
    .input("old", sql.Char(64), hash(token))
    .input("next", sql.Char(64), hash(next))
    .query(`SET XACT_ABORT ON; BEGIN TRAN;
      DECLARE @user uniqueidentifier;
      SELECT @user=s.UserId FROM dbo.RefreshSessions s WITH(UPDLOCK,HOLDLOCK) JOIN dbo.Users u ON u.Id=s.UserId WHERE s.TokenHash=@old AND s.ExpiresAt>SYSUTCDATETIME() AND u.IsActive=1;
      IF @user IS NULL BEGIN ROLLBACK; SELECT NULL AS userId; RETURN; END;
      DELETE dbo.RefreshSessions WHERE TokenHash=@old;
      INSERT dbo.RefreshSessions(TokenHash,UserId,ExpiresAt) VALUES(@next,@user,DATEADD(day,30,SYSUTCDATETIME()));
      COMMIT; SELECT @user AS userId;`);
  const userId = result.recordset[0].userId;
  if (!userId)
    throw new HttpError(
      401,
      "Phiên đăng nhập đã hết hạn hoặc đã được sử dụng.",
    );
  return { userId, refreshToken: next };
}
async function revokeSession(token) {
  validToken(token);
  const pool = await getPool();
  await pool
    .request()
    .input("hash", sql.Char(64), hash(token))
    .query("DELETE dbo.RefreshSessions WHERE TokenHash=@hash");
}
module.exports = { createSession, rotateSession, revokeSession };
