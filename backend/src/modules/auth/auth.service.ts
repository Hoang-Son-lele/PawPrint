import bcrypt from 'bcryptjs';
import type { User, VerificationPurpose } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { sendMail } from '../../lib/mailer';
import { AppError } from '../../common/errors';
import { newId, randomToken, sha256 } from '../../common/utils/crypto';
import { signAccessToken } from '../../common/middlewares/auth';
import { toUserDto } from '../users/users.mapper';
import type { RegisterInput } from './auth.schema';

const BCRYPT_ROUNDS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;
// Hash giả để so sánh khi email không tồn tại -> chống dò email qua thời gian phản hồi
const DUMMY_HASH = bcrypt.hashSync('pawprint-dummy-password', BCRYPT_ROUNDS);

export interface ClientContext {
  ip?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

// ----------------------------------------------------------------------------- tokens

async function issueTokens(user: User, ctx: ClientContext, familyId = newId()): Promise<AuthTokens> {
  return (await issueTokensWithId(user, ctx, familyId)).tokens;
}

async function issueTokensWithId(user: User, ctx: ClientContext, familyId: string) {
  const refreshToken = randomToken();
  const id = newId();
  await prisma.refreshToken.create({
    data: {
      id,
      userId: user.id,
      tokenHash: sha256(refreshToken),
      familyId,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
      userAgent: ctx.userAgent?.slice(0, 255),
      ipAddress: ctx.ip?.slice(0, 45),
    },
  });
  const tokens: AuthTokens = {
    accessToken: signAccessToken({ id: user.id, role: user.role }),
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: env.JWT_ACCESS_TTL,
  };
  return { id, tokens };
}

async function createVerificationToken(
  userId: string,
  purpose: VerificationPurpose,
  ttlMs: number,
): Promise<string> {
  const token = randomToken(32);
  await prisma.$transaction([
    // vô hiệu các token cũ cùng mục đích
    prisma.verificationToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.verificationToken.create({
      data: {
        id: newId(),
        userId,
        purpose,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    }),
  ]);
  return token;
}

async function consumeVerificationToken(token: string, purpose: VerificationPurpose) {
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) {
    throw AppError.badRequest('Liên kết không hợp lệ hoặc đã hết hạn');
  }
  // đánh dấu đã dùng một cách nguyên tử (chống dùng lại song song)
  const { count } = await prisma.verificationToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (count === 0) throw AppError.badRequest('Liên kết không hợp lệ hoặc đã hết hạn');
  return record;
}

async function sendVerifyEmail(user: User): Promise<void> {
  const token = await createVerificationToken(user.id, 'EMAIL_VERIFY', VERIFY_TTL_MS);
  const link = `${env.APP_PUBLIC_URL}verify-email?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'PawPrint – Xác minh email',
    text: `Chào ${user.displayName ?? 'bạn'},\n\nNhấn vào liên kết sau để xác minh email (hiệu lực 24 giờ):\n${link}\n\nPawPrint – Every Paw Leaves a Story`,
  });
}

function assertActive(user: User): void {
  if (user.deletedAt || user.status === 'DELETED') throw AppError.unauthorized('Tài khoản không tồn tại');
  if (user.status === 'LOCKED') throw AppError.forbidden('Tài khoản đã bị khoá');
}

// ----------------------------------------------------------------------------- use cases

export async function register(input: RegisterInput, ctx: ClientContext) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw AppError.conflict('Email đã được sử dụng');

  const user = await prisma.user.create({
    data: {
      id: newId(),
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      displayName: input.displayName,
      timeZone: input.timeZone ?? 'Asia/Ho_Chi_Minh',
    },
  });

  await sendVerifyEmail(user);
  const tokens = await issueTokens(user, ctx);
  return { user: toUserDto(user), tokens };
}

export async function login(email: string, password: string, ctx: ClientContext) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw AppError.unauthorized('Email hoặc mật khẩu không đúng');
  assertActive(user);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  const tokens = await issueTokens(updated, ctx);
  return { user: toUserDto(updated), tokens };
}

/** Refresh token rotation + phát hiện token bị đánh cắp (reuse detection). */
export async function refresh(refreshToken: string, ctx: ClientContext) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: true },
  });
  if (!record) throw AppError.unauthorized('Refresh token không hợp lệ');

  if (record.revokedAt) {
    // token đã bị xoay vòng mà vẫn được dùng lại => thu hồi toàn bộ chuỗi
    await prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw AppError.unauthorized('Refresh token đã bị thu hồi');
  }
  if (record.expiresAt < new Date()) throw AppError.unauthorized('Refresh token đã hết hạn');
  assertActive(record.user);

  // "claim" token cũ một cách nguyên tử
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: record.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw AppError.unauthorized('Refresh token đã bị thu hồi');

  const { id: newTokenId, tokens } = await issueTokensWithId(record.user, ctx, record.familyId);
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { replacedById: newTokenId },
  });
  return { user: toUserDto(record.user), tokens };
}

export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAll(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Luôn trả về thành công để không lộ email nào đã đăng ký. */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt || user.status !== 'ACTIVE') return;

  const token = await createVerificationToken(user.id, 'PASSWORD_RESET', RESET_TTL_MS);
  const link = `${env.APP_PUBLIC_URL}reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'PawPrint – Đặt lại mật khẩu',
    text: `Bạn vừa yêu cầu đặt lại mật khẩu. Liên kết có hiệu lực 30 phút:\n${link}\n\nNếu không phải bạn, hãy bỏ qua email này.`,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<string> {
  const record = await consumeVerificationToken(token, 'PASSWORD_RESET');
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
    }),
    // đăng xuất mọi thiết bị
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  return record.userId;
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await consumeVerificationToken(token, 'EMAIL_VERIFY');
  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerifiedAt: new Date() },
  });
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound();
  if (user.emailVerifiedAt) throw AppError.badRequest('Email đã được xác minh');
  await sendVerifyEmail(user);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound();
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw AppError.badRequest('Mật khẩu hiện tại không đúng');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
  });
}
