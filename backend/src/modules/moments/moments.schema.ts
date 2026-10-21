import { z } from 'zod';
import { isoDateTimeSchema, paginationQuery, uuidSchema } from '../../common/utils/schemas';

const mediaIds = z.array(uuidSchema).min(1, 'Moment cần ít nhất 1 ảnh').max(20);

export const createMomentSchema = z.object({
  caption: z.string().trim().max(2000).nullish(),
  occurredAt: isoDateTimeSchema.optional(),
  /** id trả về từ POST /media/confirm, theo thứ tự hiển thị */
  mediaIds,
});

export const updateMomentSchema = z
  .object({
    caption: z.string().trim().max(2000).nullish(),
    occurredAt: isoDateTimeSchema.optional(),
    mediaIds: mediaIds.optional(),
    version: z.number().int().positive().optional(),
  })
  .refine((v) => Object.keys(v).some((k) => k !== 'version'), 'Không có dữ liệu cần cập nhật');

export const listMomentsQuery = paginationQuery;

export type CreateMomentInput = z.infer<typeof createMomentSchema>;
export type UpdateMomentInput = z.infer<typeof updateMomentSchema>;
