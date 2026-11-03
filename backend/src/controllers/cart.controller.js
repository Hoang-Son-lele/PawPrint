const { sql, getPool } = require("../config/db");
const { asyncHandler: wrap, HttpError } = require("../utils/http");
const { uuid, quantity } = require("../utils/features");
exports.getCart = wrap(async (req, res) => {
  const pool = await getPool();
  const items = (
    await pool.request().input("user", sql.UniqueIdentifier, req.userId)
      .query(`SELECT p.Id AS id,p.Name AS name,p.Price AS price,p.Stock AS stock,p.IsActive AS isActive,p.Category AS category,p.ImageUrl AS imageUrl,c.Quantity AS quantity
    FROM dbo.CartItems c JOIN dbo.Products p ON p.Id=c.ProductId WHERE c.UserId=@user ORDER BY p.Name`)
  ).recordset;
  res.json({
    items,
    total: items.reduce((sum, x) => sum + Number(x.price) * x.quantity, 0),
  });
});

exports.updateCart = wrap(async (req, res) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("user", sql.UniqueIdentifier, req.userId)
    .input("id", sql.UniqueIdentifier, uuid(req.params.id))
    .input("quantity", sql.Int, quantity(req.body?.quantity))
    .query(`SET XACT_ABORT ON; BEGIN TRAN;
      IF NOT EXISTS(SELECT 1 FROM dbo.Products WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id AND IsActive=1 AND Stock>=@quantity)
      BEGIN ROLLBACK; SELECT 0 AS ok; RETURN; END;
      UPDATE dbo.CartItems WITH(UPDLOCK,SERIALIZABLE) SET Quantity=@quantity WHERE UserId=@user AND ProductId=@id;
      IF @@ROWCOUNT=0 INSERT dbo.CartItems(UserId,ProductId,Quantity) VALUES(@user,@id,@quantity);
      COMMIT; SELECT 1 AS ok;`);
  if (!result.recordset[0].ok)
    throw new HttpError(409, "Sản phẩm không còn đủ hàng.");
  res.json({ message: "Đã cập nhật giỏ hàng." });
});

exports.removeCartItem = wrap(async (req, res) => {
  const pool = await getPool();
  await pool
    .request()
    .input("user", sql.UniqueIdentifier, req.userId)
    .input("id", sql.UniqueIdentifier, uuid(req.params.id))
    .query("DELETE dbo.CartItems WHERE UserId=@user AND ProductId=@id");
  res.json({ message: "Đã xóa khỏi giỏ." });
});
