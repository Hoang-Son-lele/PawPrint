const { sql, getPool } = require("../config/db");
const { asyncHandler, HttpError } = require("../utils/http");
module.exports = (...roles) =>
  asyncHandler(async (req, res, next) => {
    const pool = await getPool();
    const user = (
      await pool
        .request()
        .input("id", sql.UniqueIdentifier, req.userId)
        .query(
          "SELECT Role AS role,IsActive AS isActive FROM dbo.Users WHERE Id=@id",
        )
    ).recordset[0];
    if (!user?.isActive)
      throw new HttpError(401, "Tài khoản không còn hoạt động.");
    if (!roles.includes(user.role))
      throw new HttpError(403, "Bạn không có quyền thực hiện thao tác này.");
    req.role = user.role;
    next();
  });
