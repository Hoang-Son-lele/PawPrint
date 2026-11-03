const { sql, getPool } = require('../config/db');
const { asyncHandler, HttpError } = require('../utils/http');
const { text } = require('../utils/features');
const { productImages } = require('../utils/product-images');
const columns = `Email AS email,DisplayName AS displayName,Phone AS phone,
  Bio AS bio,AvatarUrl AS avatarUrl,ProfileCreatedAt AS createdAt`;

exports.get = asyncHandler(async (req,res) => {
  const pool = await getPool();
  const result = await pool.request().input('id',sql.UniqueIdentifier,req.userId)
    .query(`SELECT ${columns} FROM dbo.Users WHERE Id=@id AND IsActive=1`);
  if (!result.recordset[0]) throw new HttpError(404,'Không tìm thấy hồ sơ.');
  res.json({profile:result.recordset[0],exists:!!result.recordset[0].createdAt});
});

exports.save = asyncHandler(async (req,res) => {
  const b = req.body || {};
  const name = text(b.displayName,100);
  const phone = text(b.phone || '',30,false);
  if (phone && !/^[+\d().\s-]{6,30}$/.test(phone)) throw new HttpError(400,'Số điện thoại không hợp lệ.');
  const bio = text(b.bio || '',1000,false);
  const avatar = productImages({imageUrls:b.avatarUrl ? [b.avatarUrl] : []})[0] || null;
  const create = req.method === 'POST';
  const pool = await getPool();
  const result = await pool.request().input('id',sql.UniqueIdentifier,req.userId)
    .input('name',sql.NVarChar(100),name).input('phone',sql.NVarChar(30),phone)
    .input('bio',sql.NVarChar(1000),bio).input('avatar',sql.NVarChar(500),avatar)
    .query(`UPDATE dbo.Users SET DisplayName=@name,Phone=@phone,Bio=@bio,AvatarUrl=@avatar,
      ProfileCreatedAt=COALESCE(ProfileCreatedAt,SYSUTCDATETIME()),UpdatedAt=SYSUTCDATETIME()
      OUTPUT inserted.Email AS email,inserted.DisplayName AS displayName,inserted.Phone AS phone,
        inserted.Bio AS bio,inserted.AvatarUrl AS avatarUrl,inserted.ProfileCreatedAt AS createdAt
      WHERE Id=@id AND IsActive=1 AND ProfileCreatedAt IS ${create ? '' : 'NOT '}NULL`);
  if (!result.recordset[0]) throw new HttpError(create ? 409 : 404,
    create ? 'Hồ sơ đã tồn tại. Hãy tải lại để chỉnh sửa.' : 'Hồ sơ chưa tồn tại. Hãy tải lại để tạo mới.');
  res.status(create ? 201 : 200).json({profile:result.recordset[0]});
});

exports.remove = asyncHandler(async (req,res) => {
  const pool = await getPool();
  await pool.request().input('id',sql.UniqueIdentifier,req.userId).query(`
    UPDATE dbo.Users SET DisplayName=NULL,Phone=NULL,Bio=NULL,AvatarUrl=NULL,ProfileCreatedAt=NULL,
      UpdatedAt=SYSUTCDATETIME() WHERE Id=@id AND IsActive=1`);
  res.json({message:'Đã xóa hồ sơ cá nhân. Tài khoản và hồ sơ thú cưng được giữ lại.'});
});
