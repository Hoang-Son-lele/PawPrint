import type { MomentMedia } from '@prisma/client';
import { env } from '../../config/env';
import { prisma, type Tx } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import {
  createUploadSignature,
  destroyResource,
  getResource,
  signedImageUrl,
  type CloudinaryResource,
} from '../../lib/cloudinary';
import { AppError } from '../../common/errors';
import { newId } from '../../common/utils/crypto';
import { assertStorage } from '../plans/plans.service';

export type UploadPurpose = 'MOMENT' | 'AVATAR';

const SIGNATURE_TTL_SECONDS = 60 * 60; // chữ ký Cloudinary có hiệu lực 1 giờ

const userPrefix = (userId: string) => `${env.CLOUDINARY_FOLDER}/u_${userId}/`;
const purposeFolder = (purpose: UploadPurpose) => (purpose === 'AVATAR' ? 'avatars' : 'moments');

export function toMediaDto(m: MomentMedia) {
  return {
    id: m.id,
    url: signedImageUrl(m.storageKey, 'full'),
    thumbnailUrl: signedImageUrl(m.storageKey, 'thumb'),
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes,
    width: m.width,
    height: m.height,
    sortOrder: m.sortOrder,
  };
}

/** B1: cấp chữ ký để client upload thẳng lên Cloudinary. */
export async function createUploadUrl(userId: string, purpose: UploadPurpose) {
  if (purpose === 'MOMENT') await assertStorage(userId);
  const publicId = `${userPrefix(userId)}${purposeFolder(purpose)}/${newId()}`;
  const signature = createUploadSignature(publicId);
  return {
    ...signature,
    publicId,
    expiresInSeconds: SIGNATURE_TTL_SECONDS,
    constraints: { maxBytes: env.MEDIA_MAX_BYTES, allowedFormats: env.mediaAllowedFormats },
  };
}

/**
 * Xác minh file đã upload: đúng thư mục của user, tồn tại trên Cloudinary,
 * đúng định dạng & dung lượng. File vi phạm sẽ bị xoá khỏi Cloudinary.
 */
export async function verifyUploaded(
  userId: string,
  publicId: string,
  purpose: UploadPurpose,
): Promise<CloudinaryResource> {
  if (!publicId.startsWith(`${userPrefix(userId)}${purposeFolder(purpose)}/`)) {
    throw AppError.forbidden('Ảnh không thuộc về tài khoản của bạn');
  }
  const resource = await getResource(publicId);
  if (!resource) throw AppError.badRequest('Ảnh chưa được upload hoặc đã bị xoá');

  const format = resource.format?.toLowerCase();
  if (!env.mediaAllowedFormats.includes(format)) {
    await destroyResource(publicId).catch(() => undefined);
    throw AppError.badRequest(`Định dạng ${format} không được hỗ trợ`);
  }
  if (resource.bytes > env.MEDIA_MAX_BYTES) {
    await destroyResource(publicId).catch(() => undefined);
    throw AppError.badRequest(`Ảnh vượt quá ${Math.round(env.MEDIA_MAX_BYTES / 1024 / 1024)} MB`);
  }
  return resource;
}

const mimeOf = (format: string) => `image/${format === 'jpg' ? 'jpeg' : format}`;

/** B2: client báo đã upload xong -> lưu metadata (trạng thái UNATTACHED). Idempotent. */
export async function confirmUpload(userId: string, publicId: string) {
  const existing = await prisma.momentMedia.findUnique({ where: { storageKey: publicId } });
  if (existing) {
    if (existing.userId !== userId) throw AppError.forbidden('Ảnh không thuộc về tài khoản của bạn');
    return toMediaDto(existing);
  }

  const resource = await verifyUploaded(userId, publicId, 'MOMENT');
  const row = await prisma.momentMedia.create({
    data: {
      id: newId(),
      userId,
      storageKey: publicId,
      mimeType: mimeOf(resource.format.toLowerCase()),
      format: resource.format.toLowerCase(),
      sizeBytes: resource.bytes,
      width: resource.width ?? null,
      height: resource.height ?? null,
      status: 'UNATTACHED',
    },
  });
  return toMediaDto(row);
}

/** Xoá ảnh đã upload nhưng chưa gắn vào moment. */
export async function deleteUnattached(userId: string, mediaId: string): Promise<void> {
  const media = await prisma.momentMedia.findFirst({ where: { id: mediaId, userId } });
  if (!media) throw AppError.notFound('Không tìm thấy ảnh');
  if (media.status === 'ATTACHED') {
    throw AppError.badRequest('Ảnh đang thuộc một moment, hãy sửa moment để gỡ ảnh');
  }
  await prisma.momentMedia.delete({ where: { id: media.id } });
  await destroyResource(media.storageKey).catch((err) =>
    logger.warn({ err, key: media.storageKey }, 'Xoá ảnh Cloudinary thất bại'),
  );
}

/**
 * Gắn danh sách ảnh (theo thứ tự) vào moment trong transaction.
 * Ảnh hợp lệ: thuộc user và đang UNATTACHED hoặc đã thuộc chính moment này.
 * Trả về storage_key của các ảnh bị gỡ khỏi moment (để xoá trên Cloudinary sau commit).
 */
export async function setMomentMedia(
  tx: Tx,
  userId: string,
  momentId: string,
  mediaIds: string[],
): Promise<string[]> {
  if (new Set(mediaIds).size !== mediaIds.length) throw AppError.badRequest('Danh sách ảnh bị trùng');

  const rows = await tx.momentMedia.findMany({ where: { id: { in: mediaIds }, userId } });
  const invalid = mediaIds.filter((id) => {
    const r = rows.find((x) => x.id === id);
    return !r || (r.status === 'ATTACHED' && r.momentId !== momentId);
  });
  if (invalid.length) throw AppError.badRequest('Một số ảnh không hợp lệ', { mediaIds: invalid });

  const removed = await tx.momentMedia.findMany({
    where: { momentId, id: { notIn: mediaIds } },
    select: { id: true, storageKey: true },
  });
  if (removed.length) {
    await tx.momentMedia.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
  }

  for (const [index, id] of mediaIds.entries()) {
    await tx.momentMedia.update({
      where: { id },
      data: { momentId, status: 'ATTACHED', sortOrder: index },
    });
  }
  return removed.map((r) => r.storageKey);
}

export async function destroyMany(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map((k) =>
      destroyResource(k).catch((err) => logger.warn({ err, key: k }, 'Xoá ảnh Cloudinary thất bại')),
    ),
  );
}

/** Job: dọn ảnh upload nhưng không gắn vào moment quá TTL. */
export async function cleanupUnattached(): Promise<number> {
  const cutoff = new Date(Date.now() - env.MEDIA_UNATTACHED_TTL_HOURS * 60 * 60 * 1000);
  const stale = await prisma.momentMedia.findMany({
    where: { status: 'UNATTACHED', createdAt: { lt: cutoff } },
    take: 200,
  });
  for (const m of stale) {
    try {
      await destroyResource(m.storageKey);
      await prisma.momentMedia.delete({ where: { id: m.id } });
    } catch (err) {
      logger.warn({ err, mediaId: m.id }, 'Dọn ảnh UNATTACHED thất bại');
    }
  }
  return stale.length;
}
