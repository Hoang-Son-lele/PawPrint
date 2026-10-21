import { prisma } from '../../lib/prisma';
import { AppError } from '../../common/errors';

/** Lấy múi giờ của user (dùng cho mọi tính toán theo ngày). */
export async function getUserTimeZone(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
  if (!user) throw AppError.unauthorized();
  return user.timeZone;
}
