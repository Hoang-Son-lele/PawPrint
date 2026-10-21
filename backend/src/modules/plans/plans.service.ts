import type { Plan } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../common/errors';

export const FREE_PLAN_ID = 'FREE';

/** Giá trị dự phòng nếu bảng plans chưa có seed FREE. */
const FALLBACK_FREE: Pick<Plan, 'id' | 'name' | 'maxPets' | 'maxMoments' | 'maxMediaPerMoment' | 'maxStorageMb'> = {
  id: FREE_PLAN_ID,
  name: 'Miễn phí',
  maxPets: 5,
  maxMoments: 50,
  maxMediaPerMoment: 5,
  maxStorageMb: 1024,
};

export type PlanLimits = typeof FALLBACK_FREE;

export async function listPlans() {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    currency: p.currency,
    billingPeriod: p.billingPeriod,
    limits: {
      maxPets: p.maxPets,
      maxMoments: p.maxMoments,
      maxMediaPerMoment: p.maxMediaPerMoment,
      maxStorageMb: p.maxStorageMb,
    },
  }));
}

async function activeSubscription(userId: string) {
  const now = new Date();
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'GRACE'] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  });
}

/**
 * Gói hiện hành. Hết hạn gói -> quay về FREE: KHÔNG xoá kỷ niệm,
 * chỉ chặn ghi mới khi vượt quota FREE (theo SRS FR-09).
 */
export async function getEffectivePlan(userId: string): Promise<PlanLimits> {
  const sub = await activeSubscription(userId);
  if (sub?.plan) return sub.plan;
  const free = await prisma.plan.findUnique({ where: { id: FREE_PLAN_ID } });
  return free ?? FALLBACK_FREE;
}

export async function getUsage(userId: string) {
  const [pets, moments, storage] = await Promise.all([
    prisma.pet.count({ where: { userId, deletedAt: null } }),
    prisma.moment.count({ where: { userId, deletedAt: null } }),
    prisma.momentMedia.aggregate({ where: { userId }, _sum: { sizeBytes: true } }),
  ]);
  return { pets, moments, storageBytes: storage._sum.sizeBytes ?? 0 };
}

export async function assertCanCreatePet(userId: string): Promise<void> {
  const plan = await getEffectivePlan(userId);
  if (plan.maxPets === null) return;
  const count = await prisma.pet.count({ where: { userId, deletedAt: null } });
  if (count >= plan.maxPets) {
    throw AppError.quota(`Gói ${plan.name} cho phép tối đa ${plan.maxPets} thú cưng`, {
      limit: plan.maxPets,
      used: count,
    });
  }
}

export async function assertCanCreateMoment(userId: string, mediaCount: number): Promise<void> {
  const plan = await getEffectivePlan(userId);
  assertMediaPerMoment(plan, mediaCount);
  if (plan.maxMoments !== null) {
    const count = await prisma.moment.count({ where: { userId, deletedAt: null } });
    if (count >= plan.maxMoments) {
      throw AppError.quota(`Gói ${plan.name} cho phép tối đa ${plan.maxMoments} moments`, {
        limit: plan.maxMoments,
        used: count,
      });
    }
  }
  await assertStorage(userId, plan);
}

export function assertMediaPerMoment(plan: PlanLimits, mediaCount: number): void {
  if (mediaCount > plan.maxMediaPerMoment) {
    throw AppError.quota(`Mỗi moment tối đa ${plan.maxMediaPerMoment} ảnh`, {
      limit: plan.maxMediaPerMoment,
      used: mediaCount,
    });
  }
}

export async function assertStorage(userId: string, plan?: PlanLimits): Promise<void> {
  const p = plan ?? (await getEffectivePlan(userId));
  if (p.maxStorageMb === null) return;
  const agg = await prisma.momentMedia.aggregate({ where: { userId }, _sum: { sizeBytes: true } });
  const used = agg._sum.sizeBytes ?? 0;
  if (used >= p.maxStorageMb * 1024 * 1024) {
    throw AppError.quota(`Đã dùng hết dung lượng ${p.maxStorageMb} MB của gói ${p.name}`, {
      limitMb: p.maxStorageMb,
      usedBytes: used,
    });
  }
}

export async function getMySubscription(userId: string) {
  const [sub, plan, usage] = await Promise.all([
    activeSubscription(userId),
    getEffectivePlan(userId),
    getUsage(userId),
  ]);
  return {
    plan: {
      id: plan.id,
      name: plan.name,
      limits: {
        maxPets: plan.maxPets,
        maxMoments: plan.maxMoments,
        maxMediaPerMoment: plan.maxMediaPerMoment,
        maxStorageMb: plan.maxStorageMb,
      },
    },
    subscription: sub
      ? {
          id: sub.id,
          provider: sub.provider,
          status: sub.status,
          startedAt: sub.startedAt,
          expiresAt: sub.expiresAt,
          autoRenew: sub.autoRenew,
        }
      : null,
    usage,
  };
}
