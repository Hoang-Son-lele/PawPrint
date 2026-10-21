import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authUser } from '../../common/middlewares/auth';
import { body, params, validate } from '../../common/middlewares/validate';
import { dateOnlySchema, idParams } from '../../common/utils/schemas';
import { audit } from '../../lib/audit';
import * as milestonesService from '../milestones/milestones.service';
import * as petsService from './pets.service';
import { createPetSchema, deletePetQuery, updatePetSchema } from './pets.schema';

const createMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(200),
  date: dateOnlySchema,
  note: z.string().max(1000).optional(),
});

/** Mount sau requireAuth (xem src/routes.ts). */
export const petsRouter = Router();

// ----------------------------------------------------------------------------- pets CRUD

petsRouter.get('/pets', async (req: Request, res: Response) => {
  res.json({ data: await petsService.listPets(authUser(req).id) });
});

petsRouter.post('/pets', validate({ body: createPetSchema }), async (req: Request, res: Response) => {
  const pet = await petsService.createPet(authUser(req).id, body(req, createPetSchema));
  res.status(201).json({ data: pet });
});

petsRouter.get('/pets/:id', validate({ params: idParams }), async (req: Request, res: Response) => {
  res.json({ data: await petsService.getPet(authUser(req).id, params(req, idParams).id) });
});

petsRouter.patch(
  '/pets/:id',
  validate({ params: idParams, body: updatePetSchema }),
  async (req: Request, res: Response) => {
    const pet = await petsService.updatePet(authUser(req).id, params(req, idParams).id, body(req, updatePetSchema));
    res.json({ data: pet });
  },
);

/** DELETE /pets/:id?confirm=true – bắt buộc xác nhận. */
petsRouter.delete(
  '/pets/:id',
  validate({ params: idParams, query: deletePetQuery }),
  async (req: Request, res: Response) => {
    const userId = authUser(req).id;
    const { id } = params(req, idParams);
    await petsService.deletePet(userId, id);
    await audit({ actorUserId: userId, action: 'pet.delete', entityType: 'pet', entityId: id, req });
    res.status(204).end();
  },
);

// ----------------------------------------------------------------------------- together days & milestones

petsRouter.get('/pets/:id/together-days', validate({ params: idParams }), async (req: Request, res: Response) => {
  res.json({ data: await milestonesService.getTogetherDays(authUser(req).id, params(req, idParams).id) });
});

petsRouter.get('/pets/:id/milestones', validate({ params: idParams }), async (req: Request, res: Response) => {
  res.json({ data: await milestonesService.listMilestones(authUser(req).id, params(req, idParams).id) });
});

petsRouter.post(
  '/pets/:id/milestones',
  validate({ params: idParams, body: createMilestoneSchema }),
  async (req: Request, res: Response) => {
    const m = await milestonesService.createCustomMilestone(
      authUser(req).id,
      params(req, idParams).id,
      body(req, createMilestoneSchema),
    );
    res.status(201).json({ data: m });
  },
);

petsRouter.delete('/milestones/:id', validate({ params: idParams }), async (req: Request, res: Response) => {
  await milestonesService.deleteCustomMilestone(authUser(req).id, params(req, idParams).id);
  res.status(204).end();
});
