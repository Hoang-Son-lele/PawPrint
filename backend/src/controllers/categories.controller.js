const { randomUUID } = require('node:crypto');
const { sql, getPool } = require('../config/db');
const { asyncHandler, HttpError } = require('../utils/http');
const { uuid, text } = require('../utils/features');

exports.list = asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`SELECT c.Id AS id,c.Name AS name,
    (SELECT COUNT(*) FROM dbo.Products p WHERE p.Category=c.Name) AS productCount
    FROM dbo.Categories c ORDER BY c.Name,c.Id`);
  res.json({ items: result.recordset });
});

exports.save = asyncHandler(async (req, res) => {
  const create = req.method === 'POST';
  const id = create ? randomUUID() : uuid(req.params.id);
  const name = text(req.body?.name, 80);
  const pool = await getPool();
  try {
    const result = await pool.request().input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar(80), name).input('actor', sql.UniqueIdentifier, req.userId)
      .query(`SET XACT_ABORT ON;
        BEGIN TRY BEGIN TRAN;
        ${create ? 'INSERT dbo.Categories(Id,Name) VALUES(@id,@name)' : 'UPDATE dbo.Categories SET Name=@name WHERE Id=@id'};
        IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 0 AS ok; RETURN; END;
        INSERT dbo.AuditLogs(ActorId,Action,EntityId) VALUES(@actor,'category.${create ? 'create' : 'update'}',@id);
        COMMIT; SELECT 1 AS ok;
        END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;`);
    if (!result.recordset[0].ok) throw new HttpError(404, 'Không tìm thấy danh mục.');
  } catch (e) {
    if ([2601,2627].includes(e.number || e.originalError?.info?.number))
      throw new HttpError(409, 'Tên danh mục đã tồn tại.');
    throw e;
  }
  res.status(create ? 201 : 200).json({ id, name });
});

exports.remove = asyncHandler(async (req, res) => {
  const pool = await getPool();
  try {
    const result = await pool.request().input('id', sql.UniqueIdentifier, uuid(req.params.id))
      .input('actor', sql.UniqueIdentifier, req.userId).query(`SET XACT_ABORT ON;
        BEGIN TRY BEGIN TRAN;
        DELETE dbo.Categories WHERE Id=@id;
        IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 0 AS ok; RETURN; END;
        INSERT dbo.AuditLogs(ActorId,Action,EntityId) VALUES(@actor,'category.delete',@id);
        COMMIT; SELECT 1 AS ok;
        END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;`);
    if (!result.recordset[0].ok) throw new HttpError(404, 'Không tìm thấy danh mục.');
  } catch (e) {
    if ((e.number || e.originalError?.info?.number) === 547)
      throw new HttpError(409, 'Danh mục đang có sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước khi xóa.');
    throw e;
  }
  res.json({ message: 'Đã xóa danh mục.' });
});
