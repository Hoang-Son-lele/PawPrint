const { randomUUID } = require("node:crypto");
const { sql, getPool } = require("../config/db");
const { HttpError, asyncHandler } = require("../utils/http");
const { uuid, text } = require("../utils/features");
const { isDate } = require("../utils/validation");
const media = require("../services/media.service");
exports.uploadAvatar = asyncHandler(async (req,res) => {
  if (!req.file) throw new HttpError(400,"Vui lòng chọn ảnh đại diện.");
  const photo = await media.uploadPhoto(req.file.buffer,
    `pawprint/avatars/${req.userId}/${randomUUID()}`,"upload");
  res.json({avatarUrl:photo.secure_url});
});
exports.uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Vui lòng chọn ảnh sản phẩm.");
  const result = await media.uploadPhoto(
    req.file.buffer,
    `pawprint/products/${randomUUID()}`,
    "upload",
  );
  res.json({ imageUrl: result.secure_url });
});
exports.createPhotoMoment = asyncHandler(async (req, res) => {
  const petId = uuid(req.params.petId),
    requestKey = uuid(req.body?.requestKey);
  if (!req.file) throw new HttpError(400, "Vui lòng chọn một ảnh.");
  const caption = text(req.body.caption || "", 1000, false);
  if (!isDate(req.body.occurredAt))
    throw new HttpError(400, "Ngày ghi nhận phải là YYYY-MM-DD.");
  const pool = await getPool();
  const request = () =>
    pool
      .request()
      .input("pet", sql.UniqueIdentifier, petId)
      .input("user", sql.UniqueIdentifier, req.userId)
      .input("key", sql.UniqueIdentifier, requestKey);
  const owned = await request().query(
    "SELECT Id FROM dbo.Pets WHERE Id=@pet AND UserId=@user AND DeletedAt IS NULL",
  );
  if (!owned.recordset[0]) throw new HttpError(404, "Không tìm thấy thú cưng.");
  const existing = await request().query(
    "SELECT Id AS id FROM dbo.Moments WHERE PetId=@pet AND RequestKey=@key",
  );
  if (existing.recordset[0]) return res.json(existing.recordset[0]);
  const photo = await media.uploadPhoto(
    req.file.buffer,
    `pawprint/${req.userId}/${petId}/${requestKey}`,
  );
  const id = randomUUID();
  const result = await request()
    .input("id", sql.UniqueIdentifier, id)
    .input("caption", sql.NVarChar(1000), caption)
    .input("date", sql.DateTime2, req.body.occurredAt)
    .input("storage", sql.NVarChar(500), photo.public_id)
    .input("format", sql.NVarChar(20), photo.format)
    .input("bytes", sql.BigInt, photo.bytes)
    .input(
      "mime",
      sql.NVarChar(100),
      `image/${photo.format === "jpg" ? "jpeg" : photo.format}`,
    ).query(`SET XACT_ABORT ON; BEGIN TRAN;
      DECLARE @existing uniqueidentifier;
      SELECT @existing=Id FROM dbo.Moments WITH(UPDLOCK,HOLDLOCK) WHERE PetId=@pet AND RequestKey=@key;
      IF @existing IS NOT NULL BEGIN COMMIT; SELECT @existing AS id; RETURN; END;
      IF NOT EXISTS(SELECT 1 FROM dbo.Pets WITH(UPDLOCK,HOLDLOCK) WHERE Id=@pet AND UserId=@user AND DeletedAt IS NULL)
      BEGIN ROLLBACK; SELECT NULL AS id; RETURN; END;
      INSERT dbo.Moments(Id,PetId,Caption,OccurredAt,RequestKey) VALUES(@id,@pet,@caption,@date,@key);
      INSERT dbo.MomentMedia(Id,MomentId,StorageKey,MimeType,SizeBytes,Format) VALUES(NEWID(),@id,@storage,@mime,@bytes,@format);
      COMMIT; SELECT @id AS id;`);
  if (!result.recordset[0]?.id)
    throw new HttpError(404, "Không tìm thấy thú cưng.");
  res.status(201).json(result.recordset[0]);
});
