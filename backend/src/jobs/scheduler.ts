import cron from 'node-cron';
import { logger } from '../lib/logger';
import { cleanupUnattached } from '../modules/media/media.service';
import { dispatchPending } from '../modules/notifications/notifications.service';
import { purgeExpiredTokens, runDailyRules } from './rules';

const running = new Set<string>();

/** Bọc job: chống chạy chồng lấn và log lỗi. */
function guard(name: string, fn: () => Promise<unknown>) {
  return async () => {
    if (running.has(name)) return;
    running.add(name);
    const started = Date.now();
    try {
      await fn();
    } catch (err) {
      logger.error({ err, job: name }, 'Job thất bại');
    } finally {
      running.delete(name);
      logger.debug({ job: name, ms: Date.now() - started }, 'Job xong');
    }
  };
}

/**
 * Lịch chạy (giờ UTC của server). Chỉ bật JOBS_ENABLED trên 1 instance;
 * khi scale lớn nên chuyển sang hàng đợi (BullMQ/Redis) như SRS đề xuất.
 */
export function startScheduler(): cron.ScheduledTask[] {
  const tasks = [
    cron.schedule('* * * * *', guard('dispatch-notifications', () => dispatchPending())),
    cron.schedule('0 * * * *', guard('daily-rules', () => runDailyRules())),
    cron.schedule('15 * * * *', guard('cleanup-media', () => cleanupUnattached())),
    cron.schedule('30 3 * * *', guard('purge-tokens', () => purgeExpiredTokens())),
  ];
  logger.info('⏰ Scheduler đã khởi động');
  return tasks;
}
