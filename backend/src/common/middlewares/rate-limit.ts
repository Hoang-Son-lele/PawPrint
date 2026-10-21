import rateLimit from 'express-rate-limit';

const handler = (_req: unknown, res: import('express').Response) => {
  res.status(429).json({
    error: { code: 'TOO_MANY_REQUESTS', message: 'Bạn thao tác quá nhanh, vui lòng thử lại sau' },
  });
};

/** Giới hạn chung cho toàn API. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/** Giới hạn chặt cho các endpoint xác thực (chống brute-force). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});
