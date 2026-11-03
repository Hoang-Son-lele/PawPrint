const { sql, getPool } = require("../config/db");
const { asyncHandler: wrap, HttpError } = require("../utils/http");
const { uuid, text, pagination } = require("../utils/features");
const productColumns =
  "Id AS id, Name AS name, Category AS category, Description AS description, Price AS price, Currency AS currency, Stock AS stock, ImageUrl AS imageUrl";
exports.listCategories = wrap(async (req, res) => {
  const pool = await getPool();
  res.json({
    items: (
      await pool
        .request()
        .query(
          "SELECT Id AS id,Name AS name FROM dbo.Categories ORDER BY Name",
        )
    ).recordset,
  });
});

exports.listProducts = wrap(async (req, res) => {
  const { offset, limit, page } = pagination(req.query);
  const pool = await getPool();
  const result = await pool
    .request()
    .input(
      "search",
      sql.NVarChar(160),
      text(req.query.search || "", 160, false),
    )
    .input(
      "category",
      sql.NVarChar(80),
      text(req.query.category || "", 80, false),
    )
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit)
    .query(`SELECT ${productColumns} FROM dbo.Products WHERE IsActive=1
      AND (@search='' OR CHARINDEX(@search,Name)>0) AND (@category='' OR Category=@category)
      ORDER BY Name,Id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
  res.json({
    items: result.recordset,
    page,
    hasMore: result.recordset.length === limit,
  });
});

exports.getProduct = wrap(async (req, res) => {
  const pool = await getPool();
  const row = (
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, uuid(req.params.id))
      .query(
        `SELECT ${productColumns},(SELECT Url AS url FROM dbo.ProductImages i WHERE i.ProductId=Products.Id ORDER BY Position FOR JSON PATH) AS imagesJson FROM dbo.Products WHERE Id=@id AND IsActive=1`,
      )
  ).recordset[0];
  if (!row) throw new HttpError(404, "Không tìm thấy sản phẩm.");
  const { imagesJson, ...product } = row;
  res.json({ product: {...product, imageUrls: JSON.parse(imagesJson || '[]').map(i => i.url)} });
});
