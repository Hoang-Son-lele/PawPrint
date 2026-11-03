class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
module.exports = { HttpError, asyncHandler };
