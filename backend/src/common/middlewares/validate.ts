import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

declare module 'express-serve-static-core' {
  interface Request {
    /** Dữ liệu đã được validate & ép kiểu bởi zod */
    valid: { body?: unknown; query?: unknown; params?: unknown };
  }
}

/**
 * Validate request bằng zod. Lỗi ZodError được errorHandler chuyển thành 400 VALIDATION_ERROR.
 * Express 5: req.query là getter read-only nên kết quả lưu vào req.valid.
 */
export const validate =
  (schemas: Schemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    req.valid = {
      body: schemas.body ? schemas.body.parse(req.body ?? {}) : undefined,
      query: schemas.query ? schemas.query.parse(req.query) : undefined,
      params: schemas.params ? schemas.params.parse(req.params) : undefined,
    };
    next();
  };

/** Helpers lấy dữ liệu đã validate với đúng kiểu. */
export const body = <S extends ZodTypeAny>(req: Request, _schema: S) => req.valid.body as z.infer<S>;
export const query = <S extends ZodTypeAny>(req: Request, _schema: S) =>
  req.valid.query as z.infer<S>;
export const params = <S extends ZodTypeAny>(req: Request, _schema: S) =>
  req.valid.params as z.infer<S>;
