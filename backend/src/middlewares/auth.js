const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { HttpError } = require("../utils/http");
const { sql, getPool } = require("../config/db");

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token)
    return next(new HttpError(401, "Bạn cần đăng nhập."));
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    if (!payload.sub) throw new Error("Missing subject");
    req.userId = payload.sub;
    getPool()
      .then((pool) =>
        pool
          .request()
          .input("id", sql.UniqueIdentifier, req.userId)
          .query("SELECT IsActive AS isActive FROM dbo.Users WHERE Id=@id"),
      )
      .then((result) =>
        result.recordset[0]?.isActive
          ? next()
          : next(
              new HttpError(401, "Tài khoản đã bị khóa hoặc không tồn tại."),
            ),
      )
      .catch(next);
  } catch {
    next(new HttpError(401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."));
  }
}
module.exports = authRequired;
