import { z } from 'zod';
import { dateOnlySchema, isoDateTimeSchema, paginationQuery } from '../../common/utils/schemas';

export const careTypeSchema = z.enum(['WEIGHT', 'BATH', 'NAIL_TRIM', 'VET_VISIT', 'NOTE', 'OTHER']);

export const MAX_WEIGHT_KG = 200;

const base = {
  valueDecimal: z.number().positive().max(9_999_999).nullish(),
  unit: z.string().trim().max(20).nullish(),
  title: z.string().trim().max(200).nullish(),
  note: z.string().max(5000).nullish(),
  occurredAt: isoDateTimeSchema.optional(),
};

export const createCareRecordSchema = z
  .object({ type: careTypeSchema, ...base })
  .superRefine((v, ctx) => {
    if (v.type === 'WEIGHT' && (v.valueDecimal == null || v.valueDecimal > MAX_WEIGHT_KG)) {
      ctx.addIssue({
        code: 'custom',
        path: ['valueDecimal'],
        message: `Cân nặng (kg) bắt buộc và trong khoảng 0–${MAX_WEIGHT_KG}`,
      });
    }
    if (v.type === 'NOTE' && !v.note && !v.title) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'Ghi chú không được để trống' });
    }
  });

export const updateCareRecordSchema = z
  .object({ ...base, version: z.number().int().positive().optional() })
  .refine((v) => Object.keys(v).some((k) => k !== 'version'), 'Không có dữ liệu cần cập nhật');

export const listCareRecordsQuery = paginationQuery.extend({
  type: careTypeSchema.optional(),
  /** Lọc theo ngày lịch (múi giờ của user) */
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});

export const weightQuery = z.object({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});

export type CreateCareRecordInput = z.infer<typeof createCareRecordSchema>;
export type UpdateCareRecordInput = z.infer<typeof updateCareRecordSchema>;
export type ListCareRecordsQuery = z.infer<typeof listCareRecordsQuery>;
