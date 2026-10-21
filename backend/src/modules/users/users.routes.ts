import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { audit } from '../../lib/audit';
import { AppError } from '../../common/errors';
import { authUser } from '../../common/middlewares/auth';
import { body, validate } from '../../common/middlewares/validate';
import { newId } from '../../common/utils/crypto';
import { passwordSchema, timeZoneSchema, uuidSchema } from '../../common/utils/schemas';
import { changePassword } from '../auth/auth.service';
import { getOwnedPet } from '../pets/pets.access';
import { syncTogetherMilestones } from '../milestones/milestones.service';
import { todayIn } from '../../common/utils/date';
import { toUserDto } from './users.mapper';

const updateMeSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100).nullish(),
    timeZone: timeZoneSchema.optional(),
    locale: z.enum(['vi', 'en']).optional(),
    /** Chọn thú cưng hiện hành (FR-02) */
    currentPetId: uuidSchema.nullish(),
    notifyEnabled: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Không có dữ liệu cần cập nhật');

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordSchema,
});

const deviceSchema = z.object({
  token: z.string().min(10).max(512),
  platform: z.enum(['IOS', 'ANDROID', 'WEB']),
});

const removeDeviceSchema = z.object({ token: z.string().min(10).max(512) });

/** Mount sau requireAuth (xem src/routes.ts). */
export const usersRouter = Router();

usersRouter.get('/users/me', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: authUser(req).id } });
  if (!user) throw AppError.unauthorized();
  res.json({ data: toUserDto(user) });
});

usersRouter.patch('/users/me', validate({ body: updateMeSchema }), async (req: Request, res: Response) => {
  const userId = authUser(req).id;
  const input = body(req, updateMeSchema);
  if (input.currentPetId) await getOwnedPet(userId, input.currentPetId);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
      ...(input.locale !== undefined && { locale: input.locale }),
      ...(input.currentPetId !== undefined && { currentPetId: input.currentPetId }),
      ...(input.notifyEnabled !== undefined && { notifyEnabled: input.notifyEnabled }),
    },
  });

  // đổi múi giờ -> "hôm nay" thay đổi, đồng bộ lại mốc ngày đồng hành
  if (input.timeZone) {
    const today = todayIn(user.timeZone);
    const pets = await prisma.pet.findMany({ where: { userId, deletedAt: null } });
    for (const pet of pets) await syncTogetherMilestones(prisma, pet, today);
  }
  res.json({ data: toUserDto(user) });
});

usersRouter.post(
  '/users/me/change-password',
  validate({ body: changePasswordSchema }),
  async (req: Request, res: Response) => {
    const userId = authUser(req).id;
    const { currentPassword, newPassword } = body(req, changePasswordSchema);
    await changePassword(userId, currentPassword, newPassword);
    await audit({ actorUserId: userId, action: 'auth.change_password', req });
    res.status(204).end();
  },
);

/** Đăng ký thiết bị nhận push (FCM/APNs). Token đã tồn tại sẽ được gán lại cho user hiện tại. */
usersRouter.post('/users/me/devices', validate({ body: deviceSchema }), async (req: Request, res: Response) => {
  const userId = authUser(req).id;
  const { token, platform } = body(req, deviceSchema);
  await prisma.deviceToken.upsert({
    where: { token },
    create: { id: newId(), userId, token, platform },
    update: { userId, platform, lastSeenAt: new Date() },
  });
  res.status(204).end();
});

usersRouter.delete('/users/me/devices', validate({ body: removeDeviceSchema }), async (req: Request, res: Response) => {
  const { token } = body(req, removeDeviceSchema);
  await prisma.deviceToken.deleteMany({ where: { token, userId: authUser(req).id } });
  res.status(204).end();
});
