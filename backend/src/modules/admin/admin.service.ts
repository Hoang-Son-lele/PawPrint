import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../common/errors';
import { afterCursorWhere, buildPage, decodeCursor } from '../../common/utils/cursor';
import { toUserDto } from '../users/users.mapper';
import { getEffectivePlan, getUsage } from '../plans/plans.service';

const DAY_MS = 86_400_000;

/** Số liệu vận hành tổng quan. */
export async function getStats() {
  const since7d = new Date(Date.now() - 7 * DAY_MS);
  const [usersByStatus, usersByRole, newUsers7d, pets, moments, careRecords, media, activeSubs, notifPending] =
    await Promise.all([
      prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.count({ where: { createdAt: { gte: since7d } } }),
      prisma.pet.count({ where: { deletedAt: null } }),
      prisma.moment.count({ where: { deletedAt: null } }),
      prisma.careRecord.count({ where: { deletedAt: null } }),
      prisma.momentMedia.aggregate({ _count: { _all: true }, _sum: { sizeBytes: true } }),
      prisma.subscription.count({
        where: { status: { in: ['ACTIVE', 'GRACE'] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      }),
      prisma.notification.count({ where: { status: 'PENDING' } }),
    ]);

  return {
    users: {
      byStatus: Object.fromEntries(usersByStatus.map((r) => [r.status, r._count._all])),
      byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count._all])),
      new7d: newUsers7d,
    },
    pets,
    moments,
    careRecords,
    media: { count: media._count._all, storageBytes: media._sum.sizeBytes ?? 0 },
    activeSubscriptions: activeSubs,
    pendingNotifications: notifPending,
  };
}

export interface ListUsersQuery {
  search?: string;
  status?: 'ACTIVE' | 'LOCKED' | 'DELETED';
  role?: 'USER' | 'ADMIN';
  cursor?: string;
  limit: number;
}

export async function listUsers(q: ListUsersQuery) {
  const cursor = decodeCursor(q.cursor);
  const where: Prisma.UserWhereInput = {
    ...(q.status && { status: q.status }),
    ...(q.role && { role: q.role }),
    ...(q.search && {
      OR: [{ email: { contains: q.search.toLowerCase() } }, { displayName: { contains: q.search } }],
    }),
    ...afterCursorWhere('createdAt', cursor),
  };
  const rows = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: q.limit + 1,
    include: { _count: { select: { pets: { where: { deletedAt: null } }, moments: { where: { deletedAt: null } } } } },
  });
  const page = buildPage(rows, q.limit, (r) => r.createdAt);
  return {
    items: page.rows.map((u) => ({
      ...toUserDto(u),
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      petCount: u._count.pets,
      momentCount: u._count.moments,
    })),
    nextCursor: page.nextCursor,
  };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      pets: { where: { deletedAt: null }, select: { id: true, name: true, species: true, createdAt: true } },
    },
  });
  if (!user) throw AppError.notFound('Không tìm thấy người dùng');
  const [plan, usage] = await Promise.all([getEffectivePlan(userId), getUsage(userId)]);
  return {
    ...toUserDto(user),
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    pets: user.pets,
    plan: { id: plan.id, name: plan.name },
    usage,
  };
}

/** Khoá/mở khoá, đổi role. Không cho admin tự hạ quyền/khoá chính mình. */
export async function updateUser(
  actorId: string,
  userId: string,
  input: { status?: 'ACTIVE' | 'LOCKED'; role?: 'USER' | 'ADMIN' },
) {
  if (actorId === userId) throw AppError.badRequest('Không thể tự thay đổi trạng thái/quyền của chính mình');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('Không tìm thấy người dùng');

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id: userId }, data: input });
    // khoá tài khoản -> thu hồi mọi phiên đăng nhập
    if (input.status === 'LOCKED') {
      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return u;
  });
  return { before: { status: user.status, role: user.role }, user: { ...toUserDto(updated), status: updated.status } };
}

export async function listAuditLogs(q: { action?: string; actorUserId?: string; cursor?: string; limit: number }) {
  const cursor = decodeCursor(q.cursor);
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(q.action && { action: { startsWith: q.action } }),
      ...(q.actorUserId && { actorUserId: q.actorUserId }),
      ...afterCursorWhere('createdAt', cursor),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: q.limit + 1,
  });
  const page = buildPage(rows, q.limit, (r) => r.createdAt);
  return { items: page.rows, nextCursor: page.nextCursor };
}
