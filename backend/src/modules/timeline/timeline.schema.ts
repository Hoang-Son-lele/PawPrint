import { z } from 'zod';
import { dateOnlySchema, paginationQuery, uuidSchema } from '../../common/utils/schemas';
import { careTypeSchema } from '../care-records/care-records.schema';

export const TIMELINE_KINDS = ['MOMENT', 'MILESTONE', 'CARE'] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

const csv = <T extends z.ZodTypeAny>(item: T) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined))
    .pipe(z.array(item).optional());

export const timelineQuery = paginationQuery.extend({
  /** vd: kinds=MOMENT,MILESTONE (mặc định: tất cả) */
  kinds: csv(z.enum(TIMELINE_KINDS)),
  /** lọc loại chăm sóc khi kinds có CARE, vd careTypes=WEIGHT,VET_VISIT */
  careTypes: csv(careTypeSchema),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});

/** Timeline tổng hợp nhiều thú cưng: thêm petIds=uuid1,uuid2 (mặc định: tất cả pet). */
export const globalTimelineQuery = timelineQuery.extend({
  petIds: csv(uuidSchema),
});

export type TimelineQuery = z.infer<typeof timelineQuery>;
