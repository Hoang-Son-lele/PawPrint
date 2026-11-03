const { randomUUID } = require("node:crypto");
const { sql, getPool } = require("../config/db");
const { HttpError, asyncHandler: wrap } = require("../utils/http");
const { uuid, pagination } = require("../utils/features");
const { photoUrl } = require("../services/media.service");
const { data, bind, ownedPet } = require("../services/journal.service");
exports.createJournalController = (kind, def) => ({
  list: wrap(async (req, res) => {
    const { offset, limit, page } = pagination(req.query);
    const pool = await getPool();
    const request = pool
      .request()
      .input("pet", sql.UniqueIdentifier, uuid(req.params.petId))
      .input("user", sql.UniqueIdentifier, req.userId);
    await ownedPet(request);
    const rows = await request
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .query(
        `SELECT r.Id AS id,${def.columns},r.OccurredAt AS occurredAt FROM dbo.${def.table} r WHERE r.PetId=@pet ${def.deleted} ORDER BY r.OccurredAt DESC,r.Id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      );
    if (kind === "moments" && rows.recordset.length) {
      const photos = await request.query(`WITH selected AS (
            SELECT Id FROM dbo.Moments WHERE PetId=@pet AND DeletedAt IS NULL
            ORDER BY OccurredAt DESC,Id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
          ) SELECT mm.MomentId AS momentId,mm.StorageKey AS storageKey,mm.Format AS format
          FROM dbo.MomentMedia mm JOIN selected m ON m.Id=mm.MomentId WHERE mm.Format IS NOT NULL`);
      for (const item of rows.recordset)
        item.photos = photos.recordset
          .filter((p) => p.momentId.toLowerCase() === item.id.toLowerCase())
          .map((p) => ({ url: photoUrl(p) }));
    }
    res.json({
      items: rows.recordset,
      page,
      hasMore: rows.recordset.length === limit,
    });
  }),
  create: wrap(async (req, res) => {
    const fields = data(req.body, kind);
    const pool = await getPool();
    const id = randomUUID();
    const request = pool
      .request()
      .input("pet", sql.UniqueIdentifier, uuid(req.params.petId))
      .input("user", sql.UniqueIdentifier, req.userId)
      .input("id", sql.UniqueIdentifier, id);
    const columns =
      kind === "moments"
        ? "(Id,PetId,Caption,OccurredAt)"
        : "(Id,PetId,Type,ValueDecimal,Unit,Note,OccurredAt)";
    const values =
      kind === "moments"
        ? "@id,@pet,@caption,@occurredAt"
        : "@id,@pet,@type,@value,@unit,@note,@occurredAt";
    const result = await bind(request, fields).query(
      `INSERT dbo.${def.table} ${columns} SELECT ${values} FROM dbo.Pets WHERE Id=@pet AND UserId=@user AND DeletedAt IS NULL`,
    );
    if (!result.rowsAffected[0])
      throw new HttpError(404, "Không tìm thấy thú cưng.");
    res.status(201).json({ id });
  }),
  update: wrap(async (req, res) => {
    const fields = data(req.body, kind);
    const pool = await getPool();
    const set =
      kind === "moments"
        ? "Caption=@caption,OccurredAt=@occurredAt"
        : "Type=@type,ValueDecimal=@value,Unit=@unit,Note=@note,OccurredAt=@occurredAt";
    const result = await bind(
      pool
        .request()
        .input("id", sql.UniqueIdentifier, uuid(req.params.id))
        .input("user", sql.UniqueIdentifier, req.userId),
      fields,
    ).query(
      `UPDATE r SET ${set} FROM dbo.${def.table} r JOIN dbo.Pets p ON p.Id=r.PetId WHERE r.Id=@id AND p.UserId=@user AND p.DeletedAt IS NULL ${def.deleted}`,
    );
    if (!result.rowsAffected[0])
      throw new HttpError(404, "Không tìm thấy bản ghi.");
    res.json({ message: "Đã cập nhật." });
  }),
  remove: wrap(async (req, res) => {
    const pool = await getPool();
    const operation =
      kind === "moments"
        ? "UPDATE r SET DeletedAt=SYSUTCDATETIME()"
        : "DELETE r";
    const result = await pool
      .request()
      .input("id", sql.UniqueIdentifier, uuid(req.params.id))
      .input("user", sql.UniqueIdentifier, req.userId)
      .query(
        `${operation} FROM dbo.${def.table} r JOIN dbo.Pets p ON p.Id=r.PetId WHERE r.Id=@id AND p.UserId=@user AND p.DeletedAt IS NULL ${def.deleted}`,
      );
    if (!result.rowsAffected[0])
      throw new HttpError(404, "Không tìm thấy bản ghi.");
    res.json({ message: "Đã xóa." });
  }),
});
exports.timeline = wrap(async (req, res) => {
  const { offset, limit, page } = pagination(req.query);
  const type = req.query.type || "all";
  if (!["all", "moment", "care", "milestone"].includes(type))
    throw new HttpError(400, "Bộ lọc không hợp lệ.");
  const pool = await getPool();
  const request = pool
    .request()
    .input("pet", sql.UniqueIdentifier, uuid(req.params.petId))
    .input("user", sql.UniqueIdentifier, req.userId);
  await ownedPet(request);
  const result = await request
    .input("type", sql.NVarChar(20), type)
    .input("offset", sql.Int, offset)
    .input("limit", sql.Int, limit).query(`
    WITH events AS (
      SELECT Id AS id,'moment' AS type,Caption AS title,OccurredAt AS occurredAt FROM dbo.Moments WHERE PetId=@pet AND DeletedAt IS NULL
      UNION ALL SELECT Id,'care',CONCAT(Type,CASE WHEN ValueDecimal IS NOT NULL THEN CONCAT(' · ',ValueDecimal,' kg') ELSE '' END,' ',Note),OccurredAt FROM dbo.CareRecords WHERE PetId=@pet
      UNION ALL SELECT Id,'milestone',Title,CAST(MilestoneDate AS datetime2) FROM dbo.Milestones WHERE PetId=@pet
    ) SELECT * FROM events WHERE @type='all' OR type=@type ORDER BY occurredAt DESC,id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
  res.json({
    items: result.recordset,
    page,
    hasMore: result.recordset.length === limit,
  });
});
