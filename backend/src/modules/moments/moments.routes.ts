import { Router, type Request, type Response } from 'express';
import { authUser } from '../../common/middlewares/auth';
import { body, params, query, validate } from '../../common/middlewares/validate';
import { idParams } from '../../common/utils/schemas';
import * as momentsService from './moments.service';
import { createMomentSchema, listMomentsQuery, updateMomentSchema } from './moments.schema';

/** Mount sau requireAuth (xem src/routes.ts). */
export const momentsRouter = Router();

momentsRouter.get(
  '/pets/:id/moments',
  validate({ params: idParams, query: listMomentsQuery }),
  async (req: Request, res: Response) => {
    const { cursor, limit } = query(req, listMomentsQuery);
    const page = await momentsService.listMoments(authUser(req).id, params(req, idParams).id, cursor, limit);
    res.json({ data: page.items, meta: { nextCursor: page.nextCursor } });
  },
);

momentsRouter.post(
  '/pets/:id/moments',
  validate({ params: idParams, body: createMomentSchema }),
  async (req: Request, res: Response) => {
    const m = await momentsService.createMoment(authUser(req).id, params(req, idParams).id, body(req, createMomentSchema));
    res.status(201).json({ data: m });
  },
);

momentsRouter.get('/moments/:id', validate({ params: idParams }), async (req: Request, res: Response) => {
  res.json({ data: await momentsService.getMoment(authUser(req).id, params(req, idParams).id) });
});

momentsRouter.patch(
  '/moments/:id',
  validate({ params: idParams, body: updateMomentSchema }),
  async (req: Request, res: Response) => {
    const m = await momentsService.updateMoment(authUser(req).id, params(req, idParams).id, body(req, updateMomentSchema));
    res.json({ data: m });
  },
);

momentsRouter.delete('/moments/:id', validate({ params: idParams }), async (req: Request, res: Response) => {
  await momentsService.deleteMoment(authUser(req).id, params(req, idParams).id);
  res.status(204).end();
});
