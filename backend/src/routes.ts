import { Router } from 'express';
import { requireAuth, requireRole } from './common/middlewares/auth';
import { prisma } from './lib/prisma';
import { authRouter } from './modules/auth/auth.routes';
import { plansRouter } from './modules/plans/plans.routes';
import { usersRouter } from './modules/users/users.routes';
import { petsRouter } from './modules/pets/pets.routes';
import { mediaRouter } from './modules/media/media.routes';
import { momentsRouter } from './modules/moments/moments.routes';
import { careRecordsRouter } from './modules/care-records/care-records.routes';
import { timelineRouter } from './modules/timeline/timeline.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { recapsRouter } from './modules/recaps/recaps.routes';
import { shopRouter } from './modules/shop/shop.routes';

export const apiRouter = Router();

// ------------------------------------------------------------------ public
apiRouter.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ data: { status: 'ok', time: new Date().toISOString() } });
});
apiRouter.use('/auth', authRouter);
apiRouter.use(plansRouter); // /plans public, /subscriptions/me tự requireAuth
apiRouter.use(shopRouter); // /products public (affiliate)

// ------------------------------------------------------------------ protected
apiRouter.use('/media', mediaRouter); // router tự requireAuth
apiRouter.use(requireAuth);
apiRouter.use(usersRouter);
apiRouter.use(petsRouter);
apiRouter.use(momentsRouter);
apiRouter.use(careRecordsRouter);
apiRouter.use(timelineRouter);
apiRouter.use(notificationsRouter);
apiRouter.use(recapsRouter);

// ------------------------------------------------------------------ admin (RBAC)
apiRouter.use('/admin', requireRole('ADMIN'), adminRouter);
