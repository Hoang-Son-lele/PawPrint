const {HttpError}=require('../utils/http');
function notFound(req, res) {
  res.status(404).json({ message: "Không tìm thấy API." });
}
function errorHandler(error, req, res, next) {
  const status = error.status || 500;
  if (status >= 500) console.error("[API ERROR]", error);
  res
    .status(status)
    .json({
      message:
        status >= 500 && !(error instanceof HttpError)
          ? "Máy chủ gặp lỗi. Kiểm tra log backend."
          : error.message,
    });
}
module.exports = { notFound, errorHandler };
