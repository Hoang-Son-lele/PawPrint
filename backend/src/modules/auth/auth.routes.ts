import { Router } from 'express';
import { requireAuth } from '../../common/middlewares/auth';
import { authLimiter } from '../../common/middlewares/rate-limit';
import { validate } from '../../common/middlewares/validate';
import * as c from './auth.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), c.register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), c.login);
authRouter.post('/refresh', validate({ body: refreshSchema }), c.refresh);
authRouter.post('/logout', validate({ body: refreshSchema }), c.logout);
authRouter.post('/logout-all', requireAuth, c.logoutAll);
authRouter.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), c.forgotPassword);
authRouter.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), c.resetPassword);
authRouter.post('/verify-email', validate({ body: verifyEmailSchema }), c.verifyEmail);
authRouter.post('/resend-verification', requireAuth, authLimiter, c.resendVerification);
