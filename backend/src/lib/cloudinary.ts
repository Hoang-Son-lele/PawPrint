import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Ảnh riêng tư dùng delivery type "authenticated":
 * URL gốc không truy cập được nếu thiếu chữ ký do server cấp (sign_url).
 */
export const MEDIA_DELIVERY_TYPE = 'authenticated' as const;

export interface UploadSignature {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  /** Các field client phải gửi kèm (multipart/form-data) cùng `file`, `api_key`, `signature`. */
  params: Record<string, string | number>;
  signature: string;
}

/** Tạo chữ ký để mobile upload thẳng lên Cloudinary (không đi qua server). */
export function createUploadSignature(publicId: string): UploadSignature {
  const params = {
    public_id: publicId,
    timestamp: Math.round(Date.now() / 1000),
    type: MEDIA_DELIVERY_TYPE,
    allowed_formats: env.mediaAllowedFormats.join(','),
    overwrite: 'false',
  };
  const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET);
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    params,
    signature,
  };
}

export interface CloudinaryResource {
  public_id: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  resource_type: string;
  type: string;
}

/** Lấy metadata tài nguyên đã upload (null nếu không tồn tại). */
export async function getResource(publicId: string): Promise<CloudinaryResource | null> {
  try {
    return (await cloudinary.api.resource(publicId, {
      type: MEDIA_DELIVERY_TYPE,
      resource_type: 'image',
    })) as CloudinaryResource;
  } catch (err) {
    const httpCode = (err as { error?: { http_code?: number } })?.error?.http_code;
    if (httpCode === 404) return null;
    throw err;
  }
}

export async function destroyResource(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    type: MEDIA_DELIVERY_TYPE,
    resource_type: 'image',
    invalidate: true,
  });
}

/** URL có chữ ký – chỉ server cấp được, client không đoán được. */
export function signedImageUrl(publicId: string, variant: 'full' | 'thumb' = 'full'): string {
  const transformation =
    variant === 'thumb'
      ? [{ width: 400, height: 400, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' }]
      : [{ width: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }];
  return cloudinary.url(publicId, {
    type: MEDIA_DELIVERY_TYPE,
    resource_type: 'image',
    sign_url: true,
    secure: true,
    transformation,
  });
}

export { cloudinary };
