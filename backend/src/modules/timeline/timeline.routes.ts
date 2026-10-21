import { Router, type Request, type Response } from 'express';
import { authUser } from '../../common/middlewares/auth';
import { params, query, validate } from '../../common/middlewares/validate';
import { idParams } from '../../common/utils/schemas';
import * as timelineService from './timeline.service';
import { globalTimelineQuery, timelineQuery } from './timeline.schema';

/** Mount sau requireAuth (xem src/routes.ts). */
export const timelineRouter = Router();

/** GET /pets/:id/timeline – Pet Journey của một thú cưng. */
timelineRouter.get(
  '/pets/:id/timeline',
  validate({ params: idParams, query: timelineQuery }),
  async (req: Request, res: Response) => {
    const page = await timelineService.getTimeline(
      authUser(req).id,
      [params(req, idParams).id],
      query(req, timelineQuery),
    );
    res.json({ data: page.items, meta: { nextCursor: page.nextCursor } });
  },
);

/** GET /timeline?petIds=... – timeline tổng hợp, lọc theo thú cưng. */
timelineRouter.get('/timeline', validate({ query: globalTimelineQuery }), async (req: Request, res: Response) => {
  const q = query(req, globalTimelineQuery);
  const page = await timelineService.getTimeline(authUser(req).id, q.petIds, q);
  res.json({ data: page.items, meta: { nextCursor: page.nextCursor } });
});
