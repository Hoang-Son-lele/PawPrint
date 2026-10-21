import { Prisma, type Notification, type NotificationType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { pushProvider } from '../../lib/push';
import { AppError } from '../../common/errors';
import { newId } from '../../common/utils/crypto';
import { afterCursorWhere, buildPage, decodeCursor } from '../../common/utils/cursor';

const MAX_RETRY = 3;

export function toNotificationDto(n: Notification) {
  return {
    id: n.id,
    type: n.type,
    petId: n.petId,
    title: n.title,
    body: n.body,
    data: n.dataJson,
    createdAt: n.scheduledAt,
    read: n.readAt !== null,
    readAt: n.readAt,
  };
}

/** Thông báo hiển thị in-app: đã tới giờ và không bị huỷ. */
const visibleWhere = (userId: string): Prisma.NotificationWhereInput => ({
  userId,
  status: { not: 'CANCELLED' },
  scheduledAt: { lte: new Date() },
});

export async function listNotifications(userId: string, cursorStr: string | undefined, limit: number) {
  const cursor = decodeCursor(cursorStr);
  const rows = await prisma.notification.findMany({
    where: { AND: [visibleWhere(userId), afterCursorWhere('scheduledAt', cursor)] },
    orderBy: [{ scheduledAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });
  const page = buildPage(rows, limit, (r) => r.scheduledAt);
  return { items: page.rows.map(toNotificationDto), nextCursor: page.nextCursor };
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { ...visibleWhere(userId), readAt: null } });
}

export async function markRead(userId: string, id: string): Promise<void> {
  const { count } = await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
  if (count === 0) throw AppError.notFound('Không tìm thấy thông báo');
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { ...visibleWhere(userId), readAt: null },
    data: { readAt: new Date() },
  });
}

export interface NewNotification {
  userId: string;
  petId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
  /** Khoá chống trùng – cùng user + dedupeKey chỉ tạo 1 lần */
  dedupeKey: string;
  scheduledAt?: Date;
}

/** Tạo thông báo (idempotent theo dedupeKey). Trả về null nếu đã tồn tại. */
export async function enqueueNotification(input: NewNotification): Promise<Notification | null> {
  try {
    return await prisma.notification.create({
      data: {
        id: newId(),
        userId: input.userId,
        petId: input.petId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        dataJson: input.data,
        dedupeKey: input.dedupeKey,
        scheduledAt: input.scheduledAt ?? new Date(),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null;
    throw err;
  }
}

/**
 * Job: gửi push cho các thông báo PENDING đã tới giờ.
 * Retry với exponential backoff (2^n phút), tối đa MAX_RETRY lần.
 */
export async function dispatchPending(batchSize = 100): Promise<number> {
  const now = new Date();
  const pending = await prisma.notification.findMany({
    where: { status: 'PENDING', scheduledAt: { lte: now } },
    orderBy: { scheduledAt: 'asc' },
    take: batchSize,
    include: { user: { select: { notifyEnabled: true, deviceTokens: { select: { token: true } } } } },
  });

  for (const n of pending) {
    const tokens = n.user.deviceTokens.map((d) => d.token);
    // không opt-in push hoặc chưa có thiết bị -> chỉ hiển thị in-app
    if (!n.user.notifyEnabled || tokens.length === 0) {
      await prisma.notification.update({ where: { id: n.id }, data: { status: 'SENT', sentAt: now } });
      continue;
    }
    try {
      const { invalidTokens } = await pushProvider.send(tokens, {
        title: n.title,
        body: n.body,
        data: { notificationId: n.id, type: n.type, ...(n.petId && { petId: n.petId }) },
      });
      if (invalidTokens.length) {
        await prisma.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } });
      }
      await prisma.notification.update({ where: { id: n.id }, data: { status: 'SENT', sentAt: new Date() } });
    } catch (err) {
      const retry = n.retryCount + 1;
      logger.warn({ err, notificationId: n.id, retry }, 'Gửi push thất bại');
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          retryCount: retry,
          lastError: String((err as Error)?.message ?? err).slice(0, 500),
          ...(retry >= MAX_RETRY
            ? { status: 'FAILED' }
            : { scheduledAt: new Date(Date.now() + 2 ** retry * 60_000) }),
        },
      });
    }
  }
  return pending.length;
}
