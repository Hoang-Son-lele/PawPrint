import { z } from 'zod';
import { isValidDateOnly, isValidTimeZone } from './date';

export const uuidSchema = z.string().uuid('ID không hợp lệ');

export const idParams = z.object({ id: uuidSchema });

export const dateOnlySchema = z
  .string()
  .refine(isValidDateOnly, 'Ngày phải có định dạng YYYY-MM-DD');

export const timeZoneSchema = z.string().max(64).refine(isValidTimeZone, 'Múi giờ không hợp lệ');

export const isoDateTimeSchema = z.coerce.date({ invalid_type_error: 'Thời gian không hợp lệ' });

export const paginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có chữ cái')
  .regex(/\d/, 'Mật khẩu phải có chữ số');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email không hợp lệ')
  .max(255);
