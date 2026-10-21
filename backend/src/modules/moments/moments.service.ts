import type { Moment, MomentMedia, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../common/errors';
import { newId } from '../../common/utils/crypto';
import { afterCursorWhere, buildPage, decodeCursor } from '../../common/utils/cursor';
import { localDateOf } from '../../common/utils/date';
import { getOwnedPet } from '../pets/pets.access';
import { getUserTimeZone } from '../users/users.helpers';
import { assertCanCreateMoment, assertMediaPerMoment, getEffectivePlan } from '../plans/plans.service';
import { destroyMany, setMomentMedia, toMediaDto } from '../media/media.service';
import type { CreateMomentInput, UpdateMomentInput } from './moments.schema';

const CLOCK_SKEW_MS = 5 * 60 * 1000;
const withMedia = { media: { orderBy: { sortOrder: 'asc' } } } satisfies Prisma.MomentInclude;

type MomentWithMedia = Moment & { media: MomentMedia[] };

export function toMomentDto(m: MomentWithMedia, timeZone: string) {
  return {
    id: m.id,
    petId: m.petId,
    caption: m.caption,
    occurredAt: m.occurredAt,
    localDate: localDateOf(m.occurredAt, timeZone),
    visibility: m.visibility,
    media: m.media.map(toMediaDto),
    version: m.version,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function assertNotFuture(at: Date | undefined) {
  if (at && at.getTime() > Date.now() + CLOCK_SKEW_MS) {
    throw AppError.badRequest('Ngày ghi nhận không được ở tương lai');
  }
}

async function getOwnedMoment(userId: string, momentId: string): Promise<MomentWithMedia> {
  const m = await prisma.moment.findFirst({
    where: { id: momentId, userId, deletedAt: null, pet: { deletedAt: null } },
    include: withMedia,
  });
  if (!m) throw AppError.notFound('Không tìm thấy khoảnh khắc');
  return m;
}

export async function listMoments(userId: string, petId: string, cursorStr: string | undefined, limit: number) {
  await getOwnedPet(userId, petId);
  const tz = await getUserTimeZone(userId);
  const cursor = decodeCursor(cursorStr);

  const rows = await prisma.moment.findMany({
    where: { petId, deletedAt: null, ...afterCursorWhere('occurredAt', cursor) },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    include: withMedia,
  });
  const page = buildPage(rows, limit, (r) => r.occurredAt);
  return { items: page.rows.map((m) => toMomentDto(m, tz)), nextCursor: page.nextCursor };
}

export async function getMoment(userId: string, momentId: string) {
  const [m, tz] = await Promise.all([getOwnedMoment(userId, momentId), getUserTimeZone(userId)]);
  return toMomentDto(m, tz);
}

export async function createMoment(userId: string, petId: string, input: CreateMomentInput) {
  await getOwnedPet(userId, petId);
  assertNotFuture(input.occurredAt);
  await assertCanCreateMoment(userId, input.mediaIds.length);

  const id = newId();
  const moment = await prisma.$transaction(async (tx) => {
    await tx.moment.create({
      data: {
        id,
        petId,
        userId,
        caption: input.caption ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
    await setMomentMedia(tx, userId, id, input.mediaIds);
    return tx.moment.findUniqueOrThrow({ where: { id }, include: withMedia });
  });
  return toMomentDto(moment, await getUserTimeZone(userId));
}

export async function updateMoment(userId: string, momentId: string, input: UpdateMomentInput) {
  const current = await getOwnedMoment(userId, momentId);
  assertNotFuture(input.occurredAt);
  if (input.mediaIds) assertMediaPerMoment(await getEffectivePlan(userId), input.mediaIds.length);

  let removedKeys: string[] = [];
  const moment = await prisma.$transaction(async (tx) => {
    const { count } = await tx.moment.updateMany({
      where: { id: momentId, userId, deletedAt: null, ...(input.version && { version: input.version }) },
      data: {
        version: { increment: 1 },
        ...(input.caption !== undefined && { caption: input.caption }),
        ...(input.occurredAt !== undefined && { occurredAt: input.occurredAt }),
      },
    });
    if (count === 0) {
      throw AppError.conflict('Khoảnh khắc đã được cập nhật ở nơi khác, vui lòng tải lại', {
        currentVersion: current.version,
      });
    }
    if (input.mediaIds) removedKeys = await setMomentMedia(tx, userId, momentId, input.mediaIds);
    return tx.moment.findUniqueOrThrow({ where: { id: momentId }, include: withMedia });
  });

  // xoá file trên Cloudinary sau khi DB commit thành công
  if (removedKeys.length) void destroyMany(removedKeys);
  return toMomentDto(moment, await getUserTimeZone(userId));
}

/** Soft-delete: kỷ niệm có thể khôi phục; ảnh giữ nguyên trên Cloudinary. */
export async function deleteMoment(userId: string, momentId: string): Promise<void> {
  await getOwnedMoment(userId, momentId);
  await prisma.moment.update({
    where: { id: momentId },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  });
}
