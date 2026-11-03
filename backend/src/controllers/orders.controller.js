const { sql, getPool } = require("../config/db");
const { asyncHandler: wrap, HttpError } = require("../utils/http");
const { randomUUID } = require("node:crypto");
const { uuid, text, pagination } = require("../utils/features");
exports.createOrder = wrap(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, randomUUID())
    .input("user", sql.UniqueIdentifier, req.userId)
    .input("key", sql.UniqueIdentifier, uuid(req.body?.requestKey))
    .input("recipient", sql.NVarChar(100), text(req.body?.recipient, 100))
    .input("phone", sql.NVarChar(30), text(req.body?.phone, 30))
    .input("address", sql.NVarChar(500), text(req.body?.address, 500))
    .query(`SET XACT_ABORT ON; BEGIN TRAN;
      DECLARE @existing uniqueidentifier;
      SELECT @existing=Id FROM dbo.Orders WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@user AND RequestKey=@key;
      IF @existing IS NOT NULL BEGIN COMMIT; SELECT @existing AS id; RETURN; END;
      DECLARE @count int; SELECT @count=COUNT(*) FROM dbo.CartItems WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@user;
      IF @count=0 BEGIN ROLLBACK; SELECT 'empty' AS error; RETURN; END;
      IF EXISTS(SELECT 1 FROM dbo.CartItems c JOIN dbo.Products p WITH(UPDLOCK,HOLDLOCK) ON p.Id=c.ProductId WHERE c.UserId=@user AND (p.IsActive=0 OR p.Stock<c.Quantity))
      BEGIN ROLLBACK; SELECT 'stock' AS error; RETURN; END;
      INSERT dbo.Orders(Id,UserId,RequestKey,Recipient,Phone,Address,Total)
        SELECT @id,@user,@key,@recipient,@phone,@address,SUM(p.Price*c.Quantity)
        FROM dbo.CartItems c JOIN dbo.Products p ON p.Id=c.ProductId WHERE c.UserId=@user;
      INSERT dbo.OrderItems(OrderId,ProductId,ProductName,UnitPrice,Quantity)
        SELECT @id,p.Id,p.Name,p.Price,c.Quantity FROM dbo.CartItems c JOIN dbo.Products p ON p.Id=c.ProductId WHERE c.UserId=@user;
      UPDATE p SET Stock=Stock-c.Quantity FROM dbo.Products p JOIN dbo.CartItems c ON c.ProductId=p.Id WHERE c.UserId=@user;
      DELETE dbo.CartItems WHERE UserId=@user; COMMIT; SELECT @id AS id;`);
  const row = result.recordset[0];
  if (row.error)
    throw new HttpError(
      409,
      row.error === "empty"
        ? "Giỏ hàng đang trống."
        : "Số lượng tồn kho đã thay đổi, vui lòng kiểm tra giỏ hàng.",
    );
  res.status(201).json({ order: row });
});

exports.listOrders = wrap(async (req, res) => {
  const { offset, limit, page } = pagination(req.query);
  const pool = await getPool();
  const rows = await pool
    .request()
    .input("user", sql.UniqueIdentifier, req.userId)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(
      "SELECT Id AS id,Total AS total,Status AS status,CreatedAt AS createdAt FROM dbo.Orders WHERE UserId=@user ORDER BY CreatedAt DESC,Id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY",
    );
  res.json({
    items: rows.recordset,
    page,
    hasMore: rows.recordset.length === limit,
  });
});

exports.getOrder = wrap(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("user", sql.UniqueIdentifier, req.userId)
    .input("id", sql.UniqueIdentifier, uuid(req.params.id))
    .query(`SELECT Id AS id,Recipient AS recipient,Phone AS phone,Address AS address,Total AS total,Status AS status,PaymentMethod AS paymentMethod,CreatedAt AS createdAt FROM dbo.Orders WHERE Id=@id AND UserId=@user;
      SELECT i.ProductName AS name,i.UnitPrice AS price,i.Quantity AS quantity FROM dbo.OrderItems i JOIN dbo.Orders o ON o.Id=i.OrderId WHERE o.Id=@id AND o.UserId=@user;`);
  if (!result.recordsets[0][0])
    throw new HttpError(404, "Không tìm thấy đơn hàng.");
  res.json({
    order: { ...result.recordsets[0][0], items: result.recordsets[1] },
  });
});
