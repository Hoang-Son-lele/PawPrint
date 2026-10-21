import type { Request, Response } from 'express';
import { audit } from '../../lib/audit';
import { authUser } from '../../common/middlewares/auth';
import { body } from '../../common/middlewares/validate';
import * as authService from './auth.service';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schema';

const ctxOf = (req: Request): authService.ClientContext => ({
  ip: req.ip,
  userAgent: req.get('user-agent'),
});

export async function register(req: Request, res: Response) {
  const input = body(req, registerSchema);
  const result = await authService.register(input, ctxOf(req));
  await audit({ actorUserId: result.user.id, action: 'auth.register', req });
  res.status(201).json({ data: result });
}

export async function login(req: Request, res: Response) {
  const { email, password } = body(req, loginSchema);
  const result = await authService.login(email, password, ctxOf(req));
  await audit({ actorUserId: result.user.id, action: 'auth.login', req });
  res.json({ data: result });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = body(req, refreshSchema);
  res.json({ data: await authService.refresh(refreshToken, ctxOf(req)) });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = body(req, refreshSchema);
  await authService.logout(refreshToken);
  res.status(204).end();
}

export async function logoutAll(req: Request, res: Response) {
  const user = authUser(req);
  await authService.logoutAll(user.id);
  await audit({ actorUserId: user.id, action: 'auth.logout_all', req });
  res.status(204).end();
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = body(req, forgotPasswordSchema);
  await authService.forgotPassword(email);
  res.json({ data: { message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu' } });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = body(req, resetPasswordSchema);
  const userId = await authService.resetPassword(token, newPassword);
  await audit({ actorUserId: userId, action: 'auth.reset_password', req });
  res.json({ data: { message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại' } });
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = body(req, verifyEmailSchema);
  await authService.verifyEmail(token);
  res.json({ data: { message: 'Xác minh email thành công' } });
}

export async function resendVerification(req: Request, res: Response) {
  await authService.resendVerification(authUser(req).id);
  res.json({ data: { message: 'Đã gửi lại email xác minh' } });
}
