import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { dbToDateOnly, diffDays, localDateOf, localHourOf, todayIn } from '../common/utils/date';
import { syncTogetherMilestones } from '../modules/milestones/milestones.service';
import { enqueueNotification } from '../modules/notifications/notifications.service';

const BATCH = 200;

/**
 * Chạy mỗi giờ. Chỉ xử lý user có giờ địa phương == REMINDER_LOCAL_HOUR
 * => mỗi user nhận nhắc nhở đúng 1 lần/ngày vào giờ hợp lý theo múi giờ của họ.
 */
export async function runDailyRules(now: Date = new Date()): Promise<void> {
  const zones = await prisma.user.groupBy({
    by: ['timeZone'],
    where: { status: 'ACTIVE', deletedAt: null },
  });
  const dueZones = zones
    .map((z) => z.timeZone)
    .filter((tz) => {
      try {
        return localHourOf(now, tz) === env.REMINDER_LOCAL_HOUR;
      } catch {
        return false;
      }
    });
  if (!dueZones.length) return;

  let cursorId: string | undefined;
  let processed = 0;
  for (;;) {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE', deletedAt: null, timeZone: { in: dueZones } },
      select: { id: true, timeZone: true },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursorId && { cursor: { id: cursorId }, skip: 1 }),
    });
    if (!users.length) break;
    for (const u of users) {
      try {
        await processUser(u.id, u.timeZone, now);
      } catch (err) {
        logger.error({ err, userId: u.id }, 'Daily rules thất bại cho user');
      }
    }
    processed += users.length;
    cursorId = users[users.length - 1]?.id;
  }
  logger.info({ processed, zones: dueZones }, 'Daily rules hoàn tất');
}

async function processUser(userId: string, tz: string, now: Date): Promise<void> {
  const today = todayIn(tz, now);
  const pets = await prisma.pet.findMany({ where: { userId, deletedAt: null } });
  if (!pets.length) return;

  // cân nặng gần nhất của từng pet
  const lastWeights = await prisma.careRecord.groupBy({
    by: ['petId'],
    where: { petId: { in: pets.map((p) => p.id) }, type: 'WEIGHT', deletedAt: null },
    _max: { occurredAt: true },
  });
  const lastWeightOf = new Map(lastWeights.map((w) => [w.petId, w._max.occurredAt]));

  for (const pet of pets) {
    // --- Rule 1: mốc ngày đồng hành (100/365/1000) đến đúng hôm nay
    const created = await syncTogetherMilestones(prisma, pet, today);
    for (const m of created) {
      if (dbToDateOnly(m.milestoneDate) !== today) continue;
      await enqueueNotification({
        userId,
        petId: pet.id,
        type: 'MILESTONE',
        title: '🎉 Một cột mốc đáng nhớ!',
        body: `Hôm nay là ${m.title}. Lưu lại một khoảnh khắc nhé!`,
        data: { milestoneId: m.id, type: m.type },
        dedupeKey: `MILESTONE:${m.id}`,
      });
    }

    // --- Rule 2: chưa cập nhật cân nặng trong N ngày (SRS FR-07)
    const base = lastWeightOf.get(pet.id) ?? pet.createdAt;
    const days = diffDays(localDateOf(base, tz), today);
    if (days >= env.WEIGHT_REMINDER_DAYS) {
      const bucket = Math.floor(days / env.WEIGHT_REMINDER_DAYS); // nhắc lại mỗi N ngày nếu vẫn chưa cập nhật
      await enqueueNotification({
        userId,
        petId: pet.id,
        type: 'WEIGHT_REMINDER',
        title: `⚖️ Cập nhật cân nặng cho ${pet.name}`,
        body: `Đã ${days} ngày bạn chưa ghi cân nặng của ${pet.name}. Theo dõi đều đặn giúp phát hiện thay đổi sớm hơn.`,
        data: { daysSinceLastWeight: days },
        dedupeKey: `WEIGHT:${pet.id}:${base.toISOString().slice(0, 10)}:${bucket}`,
      });
    }
  }
}

/** Dọn token hết hạn (refresh / verification). */
export async function purgeExpiredTokens(): Promise<void> {
  const now = new Date();
  const [r, v] = await Promise.all([
    prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.verificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  logger.info({ refresh: r.count, verification: v.count }, 'Đã dọn token hết hạn');
}
