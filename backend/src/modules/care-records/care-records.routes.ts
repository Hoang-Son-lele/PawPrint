import { Router, type Request, type Response } from 'express';
import { authUser } from '../../common/middlewares/auth';
import { body, params, query, validate } from '../../common/middlewares/validate';
import { idParams } from '../../common/utils/schemas';
import * as careService from './care-records.service';
import {
  createCareRecordSchema,
  listCareRecordsQuery,
  updateCareRecordSchema,
  weightQuery,
} from './care-records.schema';

/** Mount sau requireAuth (xem src/routes.ts). */
export const careRecordsRouter = Router();

careRecordsRouter.get(
  '/pets/:id/care-records',
  validate({ params: idParams, query: listCareRecordsQuery }),
  async (req: Request, res: Response) => {
    const page = await careService.listCareRecords(
      authUser(req).id,
      params(req, idParams).id,
      query(req, listCareRecordsQuery),
    );
    res.json({ data: page.items, meta: { nextCursor: page.nextCursor } });
  },
);

careRecordsRouter.post(
  '/pets/:id/care-records',
  validate({ params: idParams, body: createCareRecordSchema }),
  async (req: Request, res: Response) => {
    const r = await careService.createCareRecord(
      authUser(req).id,
      params(req, idParams).id,
      body(req, createCareRecordSchema),
    );
    res.status(201).json({ data: r });
  },
);

/** GET /pets/:id/weights – biến động cân nặng (biểu đồ). */
careRecordsRouter.get(
  '/pets/:id/weights',
  validate({ params: idParams, query: weightQuery }),
  async (req: Request, res: Response) => {
    const { from, to } = query(req, weightQuery);
    res.json({ data: await careService.getWeightSeries(authUser(req).id, params(req, idParams).id, from, to) });
  },
);

careRecordsRouter.get('/care-records/:id', validate({ params: idParams }), async (req: Request, res: Response) => {
  res.json({ data: await careService.getCareRecord(authUser(req).id, params(req, idParams).id) });
});

careRecordsRouter.patch(
  '/care-records/:id',
  validate({ params: idParams, body: updateCareRecordSchema }),
  async (req: Request, res: Response) => {
    const r = await careService.updateCareRecord(
      authUser(req).id,
      params(req, idParams).id,
      body(req, updateCareRecordSchema),
    );
    res.json({ data: r });
  },
);

careRecordsRouter.delete('/care-records/:id', validate({ params: idParams }), async (req: Request, res: Response) => {
  await careService.deleteCareRecord(authUser(req).id, params(req, idParams).id);
  res.status(204).end();
});
