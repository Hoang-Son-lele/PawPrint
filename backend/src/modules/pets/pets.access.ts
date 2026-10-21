import type { Pet } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../common/errors';

/**
 * Kiểm tra ownership: chỉ chủ sở hữu mới truy cập được pet.
 * Trả 404 (không phải 403) để không lộ sự tồn tại của pet người khác.
 */
export async function getOwnedPet(userId: string, petId: string): Promise<Pet> {
  const pet = await prisma.pet.findFirst({ where: { id: petId, userId, deletedAt: null } });
  if (!pet) throw AppError.notFound('Không tìm thấy thú cưng');
  return pet;
}

/** Danh sách id pet hợp lệ của user (lọc theo petIds nếu có). */
export async function getOwnedPetIds(userId: string, petIds?: string[]): Promise<string[]> {
  const pets = await prisma.pet.findMany({
    where: { userId, deletedAt: null, ...(petIds?.length ? { id: { in: petIds } } : {}) },
    select: { id: true },
  });
  if (petIds?.length && pets.length !== new Set(petIds).size) {
    throw AppError.notFound('Không tìm thấy thú cưng');
  }
  return pets.map((p) => p.id);
}
