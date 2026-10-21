import { env } from './config/env';
import { createApp, API_PREFIX } from './app';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { startScheduler } from './jobs/scheduler';

async function main() {
  await prisma.$connect();
  logger.info('✅ Đã kết nối TiDB');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🐾 PawPrint API chạy tại http://localhost:${env.PORT}${API_PREFIX}`);
  });

  const tasks = env.JOBS_ENABLED ? startScheduler() : [];

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Đang tắt server...');
    tasks.forEach((t) => t.stop());
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(async (err) => {
  logger.fatal({ err }, 'Khởi động thất bại');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
