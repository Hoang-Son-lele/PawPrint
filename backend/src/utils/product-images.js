const { HttpError } = require('./http');

function productImages(body) {
  if (body.imageUrls === undefined && body.imageUrl === undefined) return undefined;
  const images = body.imageUrls === undefined
    ? (body.imageUrl ? [body.imageUrl] : []) : body.imageUrls;
  if (!Array.isArray(images) || images.length > 10)
    throw new HttpError(400, 'Mỗi sản phẩm tối đa 10 ảnh.');
  const result = images.map(value => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 500)
      throw new HttpError(400, 'Đường dẫn ảnh không hợp lệ.');
    const url = value.trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) throw new Error();
    } catch { throw new HttpError(400, 'Ảnh sản phẩm phải dùng HTTPS hợp lệ.'); }
    return url;
  });
  if (new Set(result).size !== result.length) throw new HttpError(400, 'Ảnh sản phẩm bị trùng.');
  return result;
}
module.exports = { productImages };
