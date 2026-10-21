import { Router, type Request, type Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authUser } from '../../common/middlewares/auth';
import { params, validate } from '../../common/middlewares/validate';
import { idParams } from '../../common/utils/schemas';
import { dbToDateOnly } from '../../common/utils/date';
import { getOwnedPet } from '../pets/pets.access';

/** Mount sau requireAuth (xem src/routes.ts). FR-08 Recap – chỉ đọc dữ liệu đã tổng hợp. */
export const recapsRouter = Router();

recapsRouter.get('/pets/:id/recaps', validate({ params: idParams }), async (req: Request, res: Response) => {
  const { id } = params(req, idParams);
  await getOwnedPet(authUser(req).id, id);
  const rows = await prisma.recap.findMany({
    where: { petId: id },
    orderBy: [{ periodStart: 'desc' }],
    take: 36,
  });
  res.json({
    data: rows.map((r) => ({
      id: r.id,
      petId: r.petId,
      periodType: r.periodType,
      periodStart: dbToDateOnly(r.periodStart),
      payload: r.payloadJson,
      generatedAt: r.generatedAt,
    })),
  });
});
