const { getCloudinary } = require("../config/cloudinary");
const { HttpError } = require("../utils/http");
const MAX_BYTES = 10 * 1024 * 1024;
function imageFormat(buffer) {
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "jpg";
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  throw new HttpError(400, "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.");
}
async function uploadPhoto(buffer, publicId, deliveryType = "authenticated") {
  imageFormat(buffer);
  if (buffer.length > MAX_BYTES) throw new HttpError(400, "Ảnh tối đa 10 MB.");
  const cloud = getCloudinary();
  // Deterministic ID makes a retry reuse the same asset rather than upload duplicates.
  try {
    const result = await new Promise((resolve, reject) =>
      cloud.uploader
        .upload_stream(
          {
            public_id: publicId,
            resource_type: "image",
            type: deliveryType,
            overwrite: false,
          },
          (error, result) => (error ? reject(error) : resolve(result)),
        )
        .end(buffer),
    );
    if (!result.bytes || !result.format)
      return cloud.api.resource(publicId, {
        type: deliveryType,
        resource_type: "image",
      });
    return result;
  } catch (error) {
    if (error.http_code === 409)
      return cloud.api.resource(publicId, {
        type: deliveryType,
        resource_type: "image",
      });
    throw new HttpError(
      502,
      "Không tải được ảnh lên Cloudinary. Vui lòng thử lại.",
    );
  }
}
function photoUrl(media) {
  return getCloudinary().utils.private_download_url(
    media.storageKey,
    media.format,
    {
      type: "authenticated",
      resource_type: "image",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
  );
}
module.exports = { MAX_BYTES, imageFormat, uploadPhoto, photoUrl };
