const { sql, getPool } = require("../config/db");
const { asyncHandler, HttpError } = require("../utils/http");
const { pagination, text, uuid } = require("../utils/features");
exports.list = asyncHandler(async (req, res) => {
  const { offset, limit, page } = pagination(req.query);
  const pool = await getPool();
  const result = await pool
    .request()
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .input(
      "search",
      sql.NVarChar(254),
      text(req.query.search || "", 254, false),
    )
    .query(`SELECT Id AS id,Email AS email,DisplayName AS displayName,Role AS role,IsActive AS isActive,CreatedAt AS createdAt
      FROM dbo.Users WHERE CHARINDEX(@search,Email)>0 OR CHARINDEX(@search,COALESCE(DisplayName,''))>0
      ORDER BY CreatedAt DESC,Id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
  res.json({
    items: result.recordset,
    page,
    hasMore: result.recordset.length === limit,
  });
});
exports.update = asyncHandler(async (req, res) => {
  const id = uuid(req.params.id),
    body = req.body || {};
  if (
    !["owner", "manager", "staff", "admin"].includes(body.role) ||
    typeof body.isActive !== "boolean"
  )
    throw new HttpError(400, "Quyền hoặc trạng thái tài khoản không hợp lệ.");
  if (
    id.toLowerCase() === req.userId.toLowerCase() &&
    (body.role !== "admin" || !body.isActive)
  )
    throw new HttpError(
      400,
      "Không thể tự hạ quyền hoặc khóa tài khoản đang dùng.",
    );
  const pool = await getPool();
  const r = await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("actor", sql.UniqueIdentifier, req.userId)
    .input("role", sql.NVarChar(20), body.role)
    .input("active", sql.Bit, body.isActive)
    .query(`SET XACT_ABORT ON; BEGIN TRAN;
      -- Serialize role edits to protect the last active administrator.
      DECLARE @admins int;
      SELECT @admins=COUNT(*) FROM dbo.Users WITH(UPDLOCK,HOLDLOCK) WHERE Role='admin' AND IsActive=1;
      IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Id=@actor AND Role='admin' AND IsActive=1)
      BEGIN ROLLBACK; SELECT 'forbidden' AS error; RETURN; END;
      IF EXISTS(SELECT 1 FROM dbo.Users WHERE Id=@id AND Role='admin' AND IsActive=1)
        AND @admins<=1 AND (@role<>'admin' OR @active=0)
      BEGIN ROLLBACK; SELECT 'last_admin' AS error; RETURN; END;
      UPDATE dbo.Users SET Role=@role,IsActive=@active,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id;
      IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 'missing' AS error; RETURN; END;
      DELETE dbo.RefreshSessions WHERE UserId=@id;
      INSERT dbo.AuditLogs(ActorId,Action,EntityId) VALUES(@actor,CONCAT('account.',@role,'.',@active),@id);
      COMMIT; SELECT NULL AS error;`);
  const error = r.recordset[0].error;
  if (error)
    throw new HttpError(
      error === "missing" ? 404 : error === "forbidden" ? 403 : 409,
      error === "last_admin"
        ? "Cần giữ ít nhất một admin đang hoạt động."
        : "Không thể cập nhật tài khoản.",
    );
  res.json({ message: "Đã cập nhật tài khoản." });
});
