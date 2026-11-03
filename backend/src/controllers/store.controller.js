const { randomUUID } = require("node:crypto");
const { sql, getPool } = require("../config/db");
const { asyncHandler: wrap, HttpError } = require("../utils/http");
const { uuid, text, pagination } = require("../utils/features");
const { productImages } = require("../utils/product-images");
exports.deleteProduct = wrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("id", sql.UniqueIdentifier, uuid(req.params.id))
    .input("actor", sql.UniqueIdentifier, req.userId)
    .query(`SET XACT_ABORT ON; BEGIN TRAN;
      UPDATE dbo.Products SET IsActive=0 WHERE Id=@id;
      IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 0 AS ok; RETURN; END;
      INSERT dbo.AuditLogs(ActorId,Action,EntityId) VALUES(@actor,'product.delete',@id);
      COMMIT; SELECT 1 AS ok;`);
  if (!r.recordset[0].ok) throw new HttpError(404, "Không tìm thấy sản phẩm.");
  res.json({ message: "Đã ngừng bán sản phẩm, giữ lịch sử đơn hàng." });
});
exports.listProducts = wrap(async (req, res) => {
  const { offset, limit, page } = pagination(req.query);
  const pool = await getPool();
  const result = await pool
    .request()
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(
      "SELECT Id AS id,Name AS name,Category AS category,Description AS description,Price AS price,Stock AS stock,IsActive AS isActive,ImageUrl AS imageUrl,(SELECT Url AS url FROM dbo.ProductImages i WHERE i.ProductId=Products.Id ORDER BY Position FOR JSON PATH) AS imagesJson FROM dbo.Products ORDER BY Name,Id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY",
    );
  res.json({
    items: result.recordset.map(({ imagesJson, ...p }) => ({...p, imageUrls: JSON.parse(imagesJson || '[]').map(i => i.url)})),
    page,
    hasMore: result.recordset.length === limit,
  });
});

exports.listAudit = wrap(async (req, res) => {
  const { offset, limit, page } = pagination(req.query);
  const pool = await getPool();
  const r = await pool
    .request()
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(
      "SELECT Id AS id,ActorId AS actorId,Action AS action,EntityId AS entityId,CreatedAt AS createdAt FROM dbo.AuditLogs ORDER BY Id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY",
    );
  res.json({ items: r.recordset, page, hasMore: r.recordset.length === limit });
});

exports.listOrders = wrap(async (req, res) => {
  const { offset, limit, page } = pagination(req.query);
  const pool = await getPool();
  const r = await pool
    .request()
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`SELECT o.Id AS id,o.Recipient AS recipient,o.Phone AS phone,o.Address AS address,o.Total AS total,o.Status AS status,o.CreatedAt AS createdAt,
      o.PaymentMethod AS paymentMethod,u.Email AS customerEmail,
      (SELECT ProductName AS name,Quantity AS quantity,UnitPrice AS price FROM dbo.OrderItems i WHERE i.OrderId=o.Id FOR JSON PATH) AS itemsJson
      FROM dbo.Orders o JOIN dbo.Users u ON u.Id=o.UserId ORDER BY o.CreatedAt DESC,o.Id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
  res.json({
    items: r.recordset.map(({ itemsJson, ...o }) => ({
      ...o,
      items: JSON.parse(itemsJson),
    })),
    page,
    hasMore: r.recordset.length === limit,
  });
});

exports.updateOrder = wrap(async (req, res) => {
  const transitions = {
    confirmed: "pending",
    shipping: "confirmed",
    delivered: "shipping",
    cancelled: "pending",
  };
  const status = req.body?.status;
  if (!Object.hasOwn(transitions, status))
    throw new HttpError(400, "Trạng thái không hợp lệ.");
  const pool = await getPool();
  const r = await pool
    .request()
    .input("actor", sql.UniqueIdentifier, req.userId)
    .input("id", sql.UniqueIdentifier, uuid(req.params.id))
    .input("status", sql.NVarChar(30), status)
    .input("previous", sql.NVarChar(30), transitions[status])
    .query(`SET XACT_ABORT ON; BEGIN TRAN;
      UPDATE dbo.Orders WITH(UPDLOCK,HOLDLOCK) SET Status=@status WHERE Id=@id AND Status=@previous;
      IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 0 AS ok; RETURN; END;
      IF @status='cancelled' UPDATE p SET Stock=Stock+i.Quantity FROM dbo.Products p JOIN dbo.OrderItems i ON i.ProductId=p.Id WHERE i.OrderId=@id;
      INSERT dbo.AuditLogs(ActorId,Action,EntityId) VALUES(@actor,CONCAT('order.',@status),@id);
      COMMIT; SELECT 1 AS ok;`);
  if (!r.recordset[0].ok)
    throw new HttpError(409, "Đơn không tồn tại hoặc trạng thái đã thay đổi.");
  res.json({ message: "Đã cập nhật đơn hàng." });
});

exports.saveProduct = wrap(async (req, res) => {
  const method = req.method.toLowerCase();
  const b = req.body || {};
  if (
    !Number.isSafeInteger(b.price) ||
    b.price < 0 ||
    b.price > 999999999999 ||
    !Number.isInteger(b.stock) ||
    b.stock < 0 ||
    b.stock > 2147483647 ||
    typeof b.isActive !== "boolean"
  )
    throw new HttpError(400, "Giá, tồn kho hoặc trạng thái không hợp lệ.");
  if (typeof b.category !== "string" || !b.category.trim())
    throw new HttpError(400, "Vui lòng chọn danh mục sản phẩm.");
  const images = productImages(b);
  const imageUrl = images?.[0] || null;
  const id = method === "put" ? uuid(req.params.id) : randomUUID();
  const pool = await getPool();
  const category = text(b.category, 80);
  const exists = await pool.request().input("category", sql.NVarChar(80), category)
    .query("SELECT 1 AS ok FROM dbo.Categories WHERE Name=@category");
  if (!exists.recordset.length) throw new HttpError(400, "Danh mục không tồn tại. Hãy chọn lại danh mục.");
  try {
  const r = await pool
    .request()
    .input("actor", sql.UniqueIdentifier, req.userId)
    .input("id", sql.UniqueIdentifier, id)
    .input("name", sql.NVarChar(160), text(b.name, 160))
    .input("category", sql.NVarChar(80), category)
    .input(
      "description",
      sql.NVarChar(2000),
      text(b.description || "", 2000, false),
    )
    .input("price", sql.Decimal(12, 0), b.price)
    .input("stock", sql.Int, b.stock)
    .input("active", sql.Bit, b.isActive)
    .input("image", sql.NVarChar(500), imageUrl)
    .input("images", sql.NVarChar(sql.MAX), images === undefined ? null : JSON.stringify(images))
    .query(`SET XACT_ABORT ON; BEGIN TRAN;
      ${method === "post" ? "INSERT dbo.Products(Id,Name,Category,Description,Price,Stock,IsActive,ImageUrl) VALUES(@id,@name,@category,@description,@price,@stock,@active,@image)" : "UPDATE dbo.Products SET Name=@name,Category=@category,Description=@description,Price=@price,Stock=@stock,IsActive=@active,ImageUrl=CASE WHEN @images IS NULL THEN ImageUrl ELSE @image END WHERE Id=@id"};
      IF @@ROWCOUNT=0 BEGIN ROLLBACK; SELECT 0 AS ok; RETURN; END;
      IF @images IS NOT NULL BEGIN
        DELETE dbo.ProductImages WHERE ProductId=@id;
        INSERT dbo.ProductImages(ProductId,Position,Url)
          SELECT @id,CONVERT(int,[key]),value FROM OPENJSON(@images);
      END;
      INSERT dbo.AuditLogs(ActorId,Action,EntityId) VALUES(@actor,'product.${method === "post" ? "create" : "update"}',@id);
      COMMIT; SELECT 1 AS ok;`);
  if (!r.recordset[0].ok) throw new HttpError(404, "Không tìm thấy sản phẩm.");
  res.status(method === "post" ? 201 : 200).json({ id });
  } catch (error) {
    if ((error.number || error.originalError?.info?.number) === 547)
      throw new HttpError(409, "Danh mục vừa thay đổi. Hãy tải lại và chọn danh mục.");
    throw error;
  }
});
