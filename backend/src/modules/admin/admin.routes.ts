import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { authUser } from '../../common/middlewares/auth';
import { body, params, query, validate } from '../../common/middlewares/validate';
import { idParams, paginationQuery, uuidSchema } from '../../common/utils/schemas';
import * as adminService from './admin.service';

const listUsersQuery = paginationQuery.extend({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'LOCKED', 'DELETED']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

const updateUserSchema = z
  .object({
    status: z.enum(['ACTIVE', 'LOCKED']).optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
  })
  .refine((v) => v.status || v.role, 'Cần status hoặc role');

const auditQuery = paginationQuery.extend({
  action: z.string().max(100).optional(),
  actorUserId: uuidSchema.optional(),
});

/** Mount tại /admin sau requireAuth + requireRole('ADMIN') (xem src/routes.ts). */
export const adminRouter = Router();

adminRouter.get('/stats', async (_req: Request, res: Response) => {
  res.json({ data: await adminService.getStats() });
});

adminRouter.get('/users', validate({ query: listUsersQuery }), async (req: Request, res: Response) => {
  const page = await adminService.listUsers(query(req, listUsersQuery));
  res.json({ data: page.items, meta: { nextCursor: page.nextCursor } });
});

adminRouter.get('/users/:id', validate({ params: idParams }), async (req: Request, res: Response) => {
  res.json({ data: await adminService.getUserDetail(params(req, idParams).id) });
});

adminRouter.patch(
  '/users/:id',
  validate({ params: idParams, body: updateUserSchema }),
  async (req: Request, res: Response) => {
    const actorId = authUser(req).id;
    const { id } = params(req, idParams);
    const input = body(req, updateUserSchema);
    const result = await adminService.updateUser(actorId, id, input);
    await audit({
      actorUserId: actorId,
      action: 'admin.user.update',
      entityType: 'user',
      entityId: id,
      metadata: { before: result.before, after: input },
      req,
    });
    res.json({ data: result.user });
  },
);

adminRouter.get('/audit-logs', validate({ query: auditQuery }), async (req: Request, res: Response) => {
  const page = await adminService.listAuditLogs(query(req, auditQuery));
  res.json({ data: page.items, meta: { nextCursor: page.nextCursor } });
});
