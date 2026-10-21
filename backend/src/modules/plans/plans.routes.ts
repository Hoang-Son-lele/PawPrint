import { Router, type Request, type Response } from 'express';
import { authUser, requireAuth } from '../../common/middlewares/auth';
import * as plansService from './plans.service';

export const plansRouter = Router();

/** GET /plans – danh sách gói (public). */
plansRouter.get('/plans', async (_req: Request, res: Response) => {
  res.json({ data: await plansService.listPlans() });
});

/** GET /subscriptions/me – gói hiện hành, trạng thái thuê bao, usage. */
plansRouter.get('/subscriptions/me', requireAuth, async (req: Request, res: Response) => {
  res.json({ data: await plansService.getMySubscription(authUser(req).id) });
});
