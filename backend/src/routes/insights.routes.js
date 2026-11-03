const router = require("express").Router();
const { sql, getPool } = require("../config/db");
const { HttpError, asyncHandler: wrap } = require("../utils/http");
const { uuid } = require("../utils/features");
router.use(require("../middlewares/auth"));
router.get(
  "/notifications",
  wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool
      .request()
      .input("user", sql.UniqueIdentifier, req.userId)
      .query(`SELECT p.Id AS petId,p.Name AS petName,'weight_due' AS type,
    MAX(c.OccurredAt) AS lastWeightAt FROM dbo.Pets p LEFT JOIN dbo.CareRecords c ON c.PetId=p.Id AND c.Type='weight'
    WHERE p.UserId=@user AND p.DeletedAt IS NULL GROUP BY p.Id,p.Name,p.CreatedAt
    HAVING COALESCE(MAX(c.OccurredAt),p.CreatedAt)<=DATEADD(day,-30,SYSUTCDATETIME())`);
    res.json({ items: r.recordset });
  }),
);
router.get(
  "/pets/:petId/recaps",
  wrap(async (req, res) => {
    const year = Number(req.query.year),
      month = Number(req.query.month);
    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 9998 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    )
      throw new HttpError(400, "Năm hoặc tháng không hợp lệ.");
    const pool = await getPool();
    const request = pool
      .request()
      .input("pet", sql.UniqueIdentifier, uuid(req.params.petId))
      .input("user", sql.UniqueIdentifier, req.userId)
      .input("start", sql.Date, `${year}-${String(month).padStart(2, "0")}-01`);
    const result = await request.query(`
    IF NOT EXISTS(SELECT 1 FROM dbo.Pets WHERE Id=@pet AND UserId=@user AND DeletedAt IS NULL) BEGIN SELECT 0 AS found; RETURN; END;
    SELECT 1 AS found,
    (SELECT COUNT(*) FROM dbo.Moments WHERE PetId=@pet AND DeletedAt IS NULL AND OccurredAt>=@start AND OccurredAt<DATEADD(month,1,@start)) AS moments,
    (SELECT COUNT(*) FROM dbo.CareRecords WHERE PetId=@pet AND OccurredAt>=@start AND OccurredAt<DATEADD(month,1,@start)) AS careRecords;
    SELECT OccurredAt AS occurredAt,ValueDecimal AS weightKg FROM dbo.CareRecords WHERE PetId=@pet AND Type='weight' AND OccurredAt>=@start AND OccurredAt<DATEADD(month,1,@start) ORDER BY OccurredAt,CreatedAt,Id;`);
    if (!result.recordsets[0][0].found)
      throw new HttpError(404, "Không tìm thấy thú cưng.");
    res.json({
      period: `${year}-${String(month).padStart(2, "0")}`,
      ...result.recordsets[0][0],
      weights: result.recordsets[1],
    });
  }),
);
module.exports = router;
