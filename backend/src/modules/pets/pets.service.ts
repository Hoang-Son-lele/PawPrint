import { Prisma, type Pet } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../common/errors';
import { newId } from '../../common/utils/crypto';
import { dateOnlyToDb, dbToDateOnly, todayIn, type DateOnly } from '../../common/utils/date';
import { avatarUrlOf } from '../users/users.mapper';
import { getUserTimeZone } from '../users/users.helpers';
import { assertCanCreatePet } from '../plans/plans.service';
import { verifyUploaded, destroyMany } from '../media/media.service';
import { syncTogetherMilestones } from '../milestones/milestones.service';
import { computeTogetherDays } from '../milestones/together-days';
import { getOwnedPet } from './pets.access';
import type { CreatePetInput, UpdatePetInput } from './pets.schema';

export function toPetDto(pet: Pet, today: DateOnly) {
  const adoptedAt = pet.adoptedAt ? dbToDateOnly(pet.adoptedAt) : null;
  const together = computeTogetherDays(adoptedAt, today);
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    birthDate: pet.birthDate ? dbToDateOnly(pet.birthDate) : null,
    adoptedAt,
    weightKg: pet.weightKg !== null ? Number(pet.weightKg) : null,
    avatar: avatarUrlOf(pet.avatarStorageKey),
    note: pet.note,
    togetherDays: together.available ? together.days : null,
    nextMilestone: together.available ? together.nextMilestone : null,
    version: pet.version,
    createdAt: pet.createdAt,
    updatedAt: pet.updatedAt,
  };
}

/** Ràng buộc ngày: không ở tương lai (theo múi giờ user) và ngày sinh <= ngày đón về. */
function assertDates(birthDate: DateOnly | null | undefined, adoptedAt: DateOnly | null | undefined, today: DateOnly) {
  if (birthDate && birthDate > today) throw AppError.badRequest('Ngày sinh không được ở tương lai');
  if (adoptedAt && adoptedAt > today) throw AppError.badRequest('Ngày đón về không được ở tương lai');
  if (birthDate && adoptedAt && birthDate > adoptedAt) {
    throw AppError.badRequest('Ngày đón về phải sau hoặc bằng ngày sinh');
  }
}

async function resolveAvatar(userId: string, publicId: string | null | undefined) {
  if (publicId === undefined) return undefined; // không đổi
  if (publicId === null) return null; // gỡ avatar
  await verifyUploaded(userId, publicId, 'AVATAR');
  return publicId;
}

export async function listPets(userId: string) {
  const [pets, tz] = await Promise.all([
    prisma.pet.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: 'asc' } }),
    getUserTimeZone(userId),
  ]);
  const today = todayIn(tz);
  return pets.map((p) => toPetDto(p, today));
}

export async function getPet(userId: string, petId: string) {
  const [pet, tz] = await Promise.all([getOwnedPet(userId, petId), getUserTimeZone(userId)]);
  return toPetDto(pet, todayIn(tz));
}

export async function createPet(userId: string, input: CreatePetInput) {
  await assertCanCreatePet(userId);
  const today = todayIn(await getUserTimeZone(userId));
  assertDates(input.birthDate, input.adoptedAt, today);
  const avatarKey = await resolveAvatar(userId, input.avatarPublicId);

  const pet = await prisma.$transaction(async (tx) => {
    const created = await tx.pet.create({
      data: {
        id: newId(),
        userId,
        name: input.name,
        species: input.species,
        breed: input.breed ?? null,
        sex: input.sex,
        birthDate: input.birthDate ? dateOnlyToDb(input.birthDate) : null,
        adoptedAt: input.adoptedAt ? dateOnlyToDb(input.adoptedAt) : null,
        weightKg: input.weightKg ?? null,
        note: input.note ?? null,
        avatarStorageKey: avatarKey ?? null,
      },
    });
    // nếu có cân nặng ban đầu -> ghi vào nhật ký để theo dõi biến động
    if (input.weightKg) {
      await tx.careRecord.create({
        data: {
          id: newId(),
          petId: created.id,
          userId,
          type: 'WEIGHT',
          valueDecimal: input.weightKg,
          unit: 'kg',
          occurredAt: new Date(),
        },
      });
    }
    // pet đầu tiên -> tự chọn làm pet hiện hành
    await tx.user.updateMany({
      where: { id: userId, currentPetId: null },
      data: { currentPetId: created.id },
    });
    await syncTogetherMilestones(tx, created, today);
    return created;
  });

  return toPetDto(pet, today);
}

export async function updatePet(userId: string, petId: string, input: UpdatePetInput) {
  const current = await getOwnedPet(userId, petId);
  const today = todayIn(await getUserTimeZone(userId));

  const nextBirth = input.birthDate !== undefined ? input.birthDate : current.birthDate ? dbToDateOnly(current.birthDate) : null;
  const nextAdopted =
    input.adoptedAt !== undefined ? input.adoptedAt : current.adoptedAt ? dbToDateOnly(current.adoptedAt) : null;
  assertDates(nextBirth, nextAdopted, today);

  const avatarKey = await resolveAvatar(userId, input.avatarPublicId);

  const data: Prisma.PetUpdateManyMutationInput = {
    version: { increment: 1 },
    ...(input.name !== undefined && { name: input.name }),
    ...(input.species !== undefined && { species: input.species }),
    ...(input.breed !== undefined && { breed: input.breed }),
    ...(input.sex !== undefined && { sex: input.sex }),
    ...(input.birthDate !== undefined && { birthDate: input.birthDate ? dateOnlyToDb(input.birthDate) : null }),
    ...(input.adoptedAt !== undefined && { adoptedAt: input.adoptedAt ? dateOnlyToDb(input.adoptedAt) : null }),
    ...(input.weightKg !== undefined && { weightKg: input.weightKg }),
    ...(input.note !== undefined && { note: input.note }),
    ...(avatarKey !== undefined && { avatarStorageKey: avatarKey }),
  };

  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.pet.updateMany({
      where: { id: petId, userId, deletedAt: null, ...(input.version && { version: input.version }) },
      data,
    });
    if (count === 0) {
      throw AppError.conflict('Hồ sơ đã được cập nhật ở nơi khác, vui lòng tải lại', {
        currentVersion: current.version,
      });
    }
    const pet = await tx.pet.findUniqueOrThrow({ where: { id: petId } });
    if (input.adoptedAt !== undefined || input.name !== undefined) {
      await syncTogetherMilestones(tx, pet, today);
    }
    return pet;
  });

  // dọn avatar cũ trên Cloudinary
  if (avatarKey !== undefined && current.avatarStorageKey && current.avatarStorageKey !== avatarKey) {
    void destroyMany([current.avatarStorageKey]);
  }
  return toPetDto(updated, today);
}

/**
 * Xoá pet (soft-delete) kèm dữ liệu liên quan: moments, care records, milestones.
 * Dữ liệu vẫn còn trong DB để có thể khôi phục theo chính sách được duyệt.
 */
export async function deletePet(userId: string, petId: string): Promise<void> {
  await getOwnedPet(userId, petId);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.pet.update({ where: { id: petId }, data: { deletedAt: now, version: { increment: 1 } } });
    await tx.moment.updateMany({ where: { petId, deletedAt: null }, data: { deletedAt: now } });
    await tx.careRecord.updateMany({ where: { petId, deletedAt: null }, data: { deletedAt: now } });
    await tx.milestone.updateMany({ where: { petId, deletedAt: null }, data: { deletedAt: now } });
    await tx.notification.updateMany({
      where: { petId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // nếu đang là pet hiện hành -> chuyển sang pet khác (nếu có)
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { currentPetId: true } });
    if (user.currentPetId === petId) {
      const next = await tx.pet.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      await tx.user.update({ where: { id: userId }, data: { currentPetId: next?.id ?? null } });
    }
  });
}
