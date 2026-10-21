import type { CareRecord, Prisma } from '@prisma/client';
import { prisma, type Tx } from '../../lib/prisma';
import { AppError } from '../../common/errors';
import { newId } from '../../common/utils/crypto';
import { afterCursorWhere, buildPage, decodeCursor } from '../../common/utils/cursor';
import { addDays, localDateOf, startOfLocalDay, type DateOnly } from '../../common/utils/date';
import { getOwnedPet } from '../pets/pets.access';
import { getUserTimeZone } from '../users/users.helpers';
import {
  MAX_WEIGHT_KG,
  type CreateCareRecordInput,
  type ListCareRecordsQuery,
  type UpdateCareRecordInput,
} from './care-records.schema';

const CLOCK_SKEW_MS = 5 * 60 * 1000;

export function toCareRecordDto(r: CareRecord, timeZone: string) {
  return {
    id: r.id,
    petId: r.petId,
    type: r.type,
    valueDecimal: r.valueDecimal !== null ? Number(r.valueDecimal) : null,
    unit: r.unit,
    title: r.title,
    note: r.note,
    occurredAt: r.occurredAt,
    localDate: localDateOf(r.occurredAt, timeZone),
    version: r.version,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Khoảng [from, to] theo ngày lịch của user -> điều kiện UTC. */
export function localRangeWhere(from: DateOnly | undefined, to: DateOnly | undefined, tz: string) {
  if (!from && !to) return undefined;
  return {
    ...(from && { gte: startOfLocalDay(from, tz) }),
    ...(to && { lt: startOfLocalDay(addDays(to, 1), tz) }),
  };
}

function assertNotFuture(at: Date | undefined) {
  if (at && at.getTime() > Date.now() + CLOCK_SKEW_MS) {
    throw AppError.badRequest('Thời gian không được ở tương lai');
  }
}

/** Đồng bộ pets.weight_kg = bản ghi cân nặng mới nhất. */
async function syncPetWeight(tx: Tx, petId: string): Promise<void> {
  const latest = await tx.careRecord.findFirst({
    where: { petId, type: 'WEIGHT', deletedAt: null },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    select: { valueDecimal: true },
  });
  await tx.pet.update({ where: { id: petId }, data: { weightKg: latest?.valueDecimal ?? null } });
}

async function getOwnedRecord(userId: string, id: string): Promise<CareRecord> {
  const r = await prisma.careRecord.findFirst({
    where: { id, userId, deletedAt: null, pet: { deletedAt: null } },
  });
  if (!r) throw AppError.notFound('Không tìm thấy bản ghi chăm sóc');
  return r;
}

export async function listCareRecords(userId: string, petId: string, q: ListCareRecordsQuery) {
  await getOwnedPet(userId, petId);
  const tz = await getUserTimeZone(userId);
  const cursor = decodeCursor(q.cursor);
  const range = localRangeWhere(q.from, q.to, tz);

  const where: Prisma.CareRecordWhereInput = {
    petId,
    deletedAt: null,
    ...(q.type && { type: q.type }),
    AND: [range ? { occurredAt: range } : {}, afterCursorWhere('occurredAt', cursor)],
  };
  const rows = await prisma.careRecord.findMany({
    where,
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: q.limit + 1,
  });
  const page = buildPage(rows, q.limit, (r) => r.occurredAt);
  return { items: page.rows.map((r) => toCareRecordDto(r, tz)), nextCursor: page.nextCursor };
}

export async function getCareRecord(userId: string, id: string) {
  const [r, tz] = await Promise.all([getOwnedRecord(userId, id), getUserTimeZone(userId)]);
  return toCareRecordDto(r, tz);
}

export async function createCareRecord(userId: string, petId: string, input: CreateCareRecordInput) {
  await getOwnedPet(userId, petId);
  assertNotFuture(input.occurredAt);
  const isWeight = input.type === 'WEIGHT';

  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.careRecord.create({
      data: {
        id: newId(),
        petId,
        userId,
        type: input.type,
        valueDecimal: input.valueDecimal ?? null,
        unit: isWeight ? 'kg' : (input.unit ?? null),
        title: input.title ?? null,
        note: input.note ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
    if (isWeight) await syncPetWeight(tx, petId);
    return created;
  });
  return toCareRecordDto(record, await getUserTimeZone(userId));
}

export async function updateCareRecord(userId: string, id: string, input: UpdateCareRecordInput) {
  const current = await getOwnedRecord(userId, id);
  assertNotFuture(input.occurredAt);
  const isWeight = current.type === 'WEIGHT';

  if (isWeight && input.valueDecimal !== undefined) {
    if (input.valueDecimal === null || input.valueDecimal > MAX_WEIGHT_KG) {
      throw AppError.badRequest(`Cân nặng (kg) bắt buộc và trong khoảng 0–${MAX_WEIGHT_KG}`);
    }
  }

  const record = await prisma.$transaction(async (tx) => {
    const { count } = await tx.careRecord.updateMany({
      where: { id, userId, deletedAt: null, ...(input.version && { version: input.version }) },
      data: {
        version: { increment: 1 },
        ...(input.valueDecimal !== undefined && { valueDecimal: input.valueDecimal }),
        ...(!isWeight && input.unit !== undefined && { unit: input.unit }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.note !== undefined && { note: input.note }),
        ...(input.occurredAt !== undefined && { occurredAt: input.occurredAt }),
      },
    });
    if (count === 0) {
      throw AppError.conflict('Bản ghi đã được cập nhật ở nơi khác, vui lòng tải lại', {
        currentVersion: current.version,
      });
    }
    if (isWeight) await syncPetWeight(tx, current.petId);
    return tx.careRecord.findUniqueOrThrow({ where: { id } });
  });
  return toCareRecordDto(record, await getUserTimeZone(userId));
}

export async function deleteCareRecord(userId: string, id: string): Promise<void> {
  const current = await getOwnedRecord(userId, id);
  await prisma.$transaction(async (tx) => {
    await tx.careRecord.update({ where: { id }, data: { deletedAt: new Date(), version: { increment: 1 } } });
    if (current.type === 'WEIGHT') await syncPetWeight(tx, current.petId);
  });
}

/** Biến động cân nặng: chuỗi điểm tăng dần theo thời gian + thống kê. */
export async function getWeightSeries(userId: string, petId: string, from?: DateOnly, to?: DateOnly) {
  await getOwnedPet(userId, petId);
  const tz = await getUserTimeZone(userId);
  const range = localRangeWhere(from, to, tz);

  const rows = await prisma.careRecord.findMany({
    where: { petId, type: 'WEIGHT', deletedAt: null, ...(range && { occurredAt: range }) },
    orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    take: 1000,
  });

  let prev: number | null = null;
  const points = rows.map((r) => {
    const value = Number(r.valueDecimal);
    const point = {
      id: r.id,
      occurredAt: r.occurredAt,
      localDate: localDateOf(r.occurredAt, tz),
      valueKg: value,
      changeKg: prev === null ? null : Math.round((value - prev) * 1000) / 1000,
    };
    prev = value;
    return point;
  });

  const values = points.map((p) => p.valueKg);
  const first = points[0];
  const last = points[points.length - 1];
  return {
    unit: 'kg',
    points,
    summary: last
      ? {
          latestKg: last.valueKg,
          latestAt: last.occurredAt,
          minKg: Math.min(...values),
          maxKg: Math.max(...values),
          changeKg: first ? Math.round((last.valueKg - first.valueKg) * 1000) / 1000 : 0,
          count: points.length,
        }
      : null,
  };
}
