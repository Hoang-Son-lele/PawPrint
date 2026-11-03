// Run from backend: node scripts/seed-cute-pets.js
// Adds demo catalog entries only; fixed IDs make reruns safe.
require('dotenv').config();
const { sql, getPool } = require('../src/config/db');
const { getCloudinary } = require('../src/config/cloudinary');
const items = [
  ['Bông — người bạn nhỏ', 'Chó cảnh', '1552053831-71594a27632d', 4500000],
  ['Milo — nụ cười đáng yêu', 'Chó cảnh', '1587300003388-59208cc962cb', 3500000],
  ['Đậu — bạn đồng hành tinh nghịch', 'Chó cảnh', '1543466835-00a7907e9de1', 4000000],
  ['Mochi — đôi mắt long lanh', 'Mèo cảnh', '1514888286974-6c03e2ca1dba', 3000000],
  ['Miu — cục bông nhỏ', 'Mèo cảnh', '1573865526739-10659fec78a5', 2500000],
  ['Luna — cô mèo dịu dàng', 'Mèo cảnh', '1533738363-b7f9aef128ce', 3200000],
];
async function main() {
  const pool = await getPool();
  try {
    const cloud = getCloudinary();
    const prepared = [];
    for (const [index, [name, category, photo, price]] of items.entries()) {
      const id = `ca7d0000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
      const exists = await pool.request().input('id', sql.UniqueIdentifier, id)
        .query('SELECT Id FROM dbo.Products WHERE Id=@id');
      if (exists.recordset.length) { console.log(`Already present: ${name}`); continue; }
      const asset = await cloud.uploader.upload(
        `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=1000&q=85`,
        { public_id: `pawprint/demo-cute-pets/pet-${index + 1}`, overwrite: false, resource_type: 'image',
          context: { source: `https://images.unsplash.com/photo-${photo}`, purpose: 'PawPrint demo catalog' } },
      );
      const check = await fetch(asset.secure_url, { method: 'HEAD' });
      if (!check.ok || !check.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image unavailable: ${name}`);
      prepared.push({ id, name, category, price, url: asset.secure_url });
    }
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      for (const item of prepared) {
        await new sql.Request(transaction)
          .input('id', sql.UniqueIdentifier, item.id)
          .input('name', sql.NVarChar(160), item.name)
          .input('category', sql.NVarChar(80), item.category)
          .input('price', sql.Decimal(12, 0), item.price)
          .input('url', sql.NVarChar(500), item.url)
          .input('description', sql.NVarChar(2000), 'Dữ liệu mẫu PawPrint: một người bạn nhỏ đáng yêu để minh họa giao diện Pet Shop. Ảnh minh họa từ Unsplash, lưu tại Cloudinary của dự án. Giá và số lượng chỉ phục vụ chạy thử, không phải thông tin rao bán thực tế.')
          .query(`IF NOT EXISTS(SELECT 1 FROM dbo.Categories WHERE Name=@category)
            INSERT dbo.Categories(Name) VALUES(@category);
            IF NOT EXISTS(SELECT 1 FROM dbo.Products WHERE Id=@id)
            BEGIN
              INSERT dbo.Products(Id,Name,Category,Description,Price,Stock,ImageUrl)
              VALUES(@id,@name,@category,@description,@price,3,@url);
              INSERT dbo.ProductImages(ProductId,Position,Url) VALUES(@id,0,@url);
            END`);
      }
      await transaction.commit();
    } catch (error) { await transaction.rollback(); throw error; }
    console.log(`Added ${prepared.length} demo pets with verified Cloudinary images.`);
  } finally { await pool.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
