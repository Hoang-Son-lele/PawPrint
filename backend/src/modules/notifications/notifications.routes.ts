import { Router, type Request, type Response } from 'express';
import { authUser } from '../../common/middlewares/auth';
import { params, query, validate } from '../../common/middlewares/validate';
import { idParams, paginationQuery } from '../../common/utils/schemas';
import * as notificationsService from './notifications.service';

/** Mount sau requireAuth (xem src/routes.ts). */
export const notificationsRouter = Router();

notificationsRouter.get('/notifications', validate({ query: paginationQuery }), async (req: Request, res: Response) => {
  const { cursor, limit } = query(req, paginationQuery);
  const page = await notificationsService.listNotifications(authUser(req).id, cursor, limit);
  res.json({ data: page.items, meta: { nextCursor: page.nextCursor } });
});

notificationsRouter.get('/notifications/unread-count', async (req: Request, res: Response) => {
  res.json({ data: { count: await notificationsService.unreadCount(authUser(req).id) } });
});

notificationsRouter.post('/notifications/read-all', async (req: Request, res: Response) => {
  await notificationsService.markAllRead(authUser(req).id);
  res.status(204).end();
});

notificationsRouter.post('/notifications/:id/read', validate({ params: idParams }), async (req: Request, res: Response) => {
  await notificationsService.markRead(authUser(req).id, params(req, idParams).id);
  res.status(204).end();
});
