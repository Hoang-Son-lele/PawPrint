const { sql, getPool } = require('../config/db');
const { asyncHandler, HttpError } = require('../utils/http');
const { uuid } = require('../utils/features');

exports.record = asyncHandler(async (req, res) => {
  const id = uuid(req.body?.eventId);
  const product = req.body?.productId == null ? null : uuid(req.body.productId);
  const pool = await getPool();
  await pool.request().input('id', sql.UniqueIdentifier, id)
    .input('user', sql.UniqueIdentifier, req.userId)
    .input('product', sql.UniqueIdentifier, product)
    .query(`SET XACT_ABORT ON; BEGIN TRAN;
      IF EXISTS(SELECT 1 FROM dbo.Users WHERE Id=@user AND Role='owner' AND IsActive=1)
        AND (@product IS NULL OR EXISTS(SELECT 1 FROM dbo.Products WHERE Id=@product AND IsActive=1))
        AND NOT EXISTS(SELECT 1 FROM dbo.ShopTraffic WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id)
        INSERT dbo.ShopTraffic(Id,UserId,ProductId) VALUES(@id,@user,@product);
      COMMIT;`);
  res.status(202).json({ message: 'Accepted' });
});

exports.summary = asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 7);
  if (![7, 30, 90].includes(days)) throw new HttpError(400, 'Chọn 7, 30 hoặc 90 ngày.');
  const pool = await getPool();
  const result = await pool.request().input('days', sql.Int, days).query(`
    DECLARE @start datetime2=CONVERT(datetime2,DATEADD(day,1-@days,CONVERT(date,DATEADD(hour,7,SYSUTCDATETIME()))));
    SET @start=DATEADD(hour,-7,@start);
    SELECT COUNT(*) AS views, COUNT(DISTINCT UserId) AS visitors,
      COUNT(CASE WHEN ProductId IS NULL THEN 1 END) AS shopViews,
      COUNT(CASE WHEN ProductId IS NOT NULL THEN 1 END) AS productViews
    FROM dbo.ShopTraffic WHERE CreatedAt>=@start;
    SELECT CONVERT(char(10),DATEADD(hour,7,CreatedAt),23) AS day,
      COUNT(*) AS views,COUNT(DISTINCT UserId) AS visitors
    FROM dbo.ShopTraffic WHERE CreatedAt>=@start
    GROUP BY CONVERT(char(10),DATEADD(hour,7,CreatedAt),23) ORDER BY day DESC;
    SELECT TOP(10) t.ProductId AS id,p.Name AS name,COUNT(*) AS views
    FROM dbo.ShopTraffic t JOIN dbo.Products p ON p.Id=t.ProductId
    WHERE t.CreatedAt>=@start GROUP BY t.ProductId,p.Name ORDER BY views DESC,p.Name;
    SELECT COUNT(*) AS orders,
      COALESCE(SUM(CASE WHEN Status='delivered' THEN Total ELSE 0 END),0) AS revenue,
      COUNT(CASE WHEN Status='pending' THEN 1 END) AS pending,
      COUNT(CASE WHEN Status='cancelled' THEN 1 END) AS cancelled
    FROM dbo.Orders WHERE CreatedAt>=@start;`);
  res.json({ days, ...result.recordsets[0][0], daily: result.recordsets[1],
    products: result.recordsets[2], sales: result.recordsets[3][0] });
});
