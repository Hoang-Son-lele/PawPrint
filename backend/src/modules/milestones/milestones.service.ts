import { Prisma, type Milestone, type Pet } from '@prisma/client';
import { prisma, type Tx } from '../../lib/prisma';
import { AppError } from '../../common/errors';
import { newId } from '../../common/utils/crypto';
import { dateOnlyToDb, dbToDateOnly, todayIn, type DateOnly } from '../../common/utils/date';
import { getOwnedPet } from '../pets/pets.access';
import { getUserTimeZone } from '../users/users.helpers';
import { computeTogetherDays, TOGETHER_MILESTONES } from './together-days';

export function toMilestoneDto(m: Milestone) {
  return {
    id: m.id,
    petId: m.petId,
    type: m.type,
    date: dbToDateOnly(m.milestoneDate),
    title: m.title,
    note: m.note,
    isSystem: m.isSystem,
    createdAt: m.createdAt,
  };
}

const togetherTitle = (days: number, petName: string) => `${days} ngày bên ${petName} 🐾`;

/**
 * Đồng bộ các mốc "ngày đồng hành" của pet:
 * - Tạo mốc đã đạt (chưa có) – unique (pet_id, dedupe_key) đảm bảo không trùng.
 * - Cập nhật ngày nếu adoptedAt thay đổi; xoá mốc chưa đạt / không còn hợp lệ.
 * Trả về các mốc vừa được tạo mới (để gửi thông báo).
 */
export async function syncTogetherMilestones(
  db: Tx | typeof prisma,
  pet: Pick<Pet, 'id' | 'userId' | 'name' | 'adoptedAt'>,
  today: DateOnly,
): Promise<Milestone[]> {
  const result = computeTogetherDays(pet.adoptedAt ? dbToDateOnly(pet.adoptedAt) : null, today);
  const keys = TOGETHER_MILESTONES.map((m) => m.type as string);

  const existing = await db.milestone.findMany({
    where: { petId: pet.id, isSystem: true, dedupeKey: { in: keys } },
  });
  const byKey = new Map(existing.map((m) => [m.dedupeKey, m]));
  const reached = result.available ? result.milestones.filter((m) => m.reached) : [];
  const reachedKeys = new Set(reached.map((m) => m.type as string));

  // xoá mốc không còn đạt (vd: sửa ngày đón về muộn hơn)
  const toRemove = existing.filter((m) => !reachedKeys.has(m.dedupeKey ?? ''));
  if (toRemove.length) {
    await db.milestone.deleteMany({ where: { id: { in: toRemove.map((m) => m.id) } } });
  }

  const created: Milestone[] = [];
  for (const m of reached) {
    const current = byKey.get(m.type);
    const date = dateOnlyToDb(m.date);
    if (!current) {
      try {
        created.push(
          await db.milestone.create({
            data: {
              id: newId(),
              petId: pet.id,
              userId: pet.userId,
              type: m.type,
              milestoneDate: date,
              title: togetherTitle(m.days, pet.name),
              isSystem: true,
              dedupeKey: m.type,
            },
          }),
        );
      } catch (err) {
        // request khác vừa tạo cùng mốc -> unique (pet_id, dedupe_key) chặn trùng, bỏ qua
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      }
    } else if (current.milestoneDate.getTime() !== date.getTime() || current.deletedAt) {
      await db.milestone.update({
        where: { id: current.id },
        data: { milestoneDate: date, title: togetherTitle(m.days, pet.name), deletedAt: null },
      });
    }
  }
  return created;
}

export async function getTogetherDays(userId: string, petId: string) {
  const [pet, tz] = await Promise.all([getOwnedPet(userId, petId), getUserTimeZone(userId)]);
  const today = todayIn(tz);
  // tự bổ sung mốc nếu job chưa chạy kịp
  await syncTogetherMilestones(prisma, pet, today);
  return { petId: pet.id, timeZone: tz, ...computeTogetherDays(pet.adoptedAt ? dbToDateOnly(pet.adoptedAt) : null, today) };
}

export async function listMilestones(userId: string, petId: string) {
  await getOwnedPet(userId, petId);
  const rows = await prisma.milestone.findMany({
    where: { petId, deletedAt: null },
    orderBy: [{ milestoneDate: 'desc' }, { id: 'desc' }],
  });
  return rows.map(toMilestoneDto);
}

export async function createCustomMilestone(
  userId: string,
  petId: string,
  input: { title: string; date: DateOnly; note?: string },
) {
  await getOwnedPet(userId, petId);
  const row = await prisma.milestone.create({
    data: {
      id: newId(),
      petId,
      userId,
      type: 'CUSTOM',
      milestoneDate: dateOnlyToDb(input.date),
      title: input.title,
      note: input.note,
      isSystem: false,
    },
  });
  return toMilestoneDto(row);
}

export async function deleteCustomMilestone(userId: string, milestoneId: string): Promise<void> {
  const m = await prisma.milestone.findFirst({
    where: { id: milestoneId, userId, deletedAt: null, pet: { deletedAt: null } },
  });
  if (!m) throw AppError.notFound('Không tìm thấy mốc kỷ niệm');
  if (m.isSystem) throw AppError.badRequest('Không thể xoá mốc do hệ thống tạo');
  await prisma.milestone.update({ where: { id: m.id }, data: { deletedAt: new Date() } });
}
