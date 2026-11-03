const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { HttpError } = require("../utils/http");
const { MAX_BYTES } = require("../services/media.service");
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 4 },
});
module.exports = [
  rateLimit({ windowMs: 60000, limit: 20 }),
  (req, res, next) => {
    parser.single("file")(req, res, (error) =>
      next(
        error
          ? new HttpError(400, "Ảnh không hợp lệ hoặc vượt quá 10 MB.")
          : undefined,
      ),
    );
  },
];
