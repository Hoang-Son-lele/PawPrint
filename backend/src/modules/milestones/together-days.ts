import type { MilestoneType } from '@prisma/client';
import { addDays, diffDays, type DateOnly } from '../../common/utils/date';

/** Các mốc ngày đồng hành theo SRS FR-03. */
export const TOGETHER_MILESTONES: ReadonlyArray<{ days: number; type: MilestoneType }> = [
  { days: 100, type: 'TOGETHER_100' },
  { days: 365, type: 'TOGETHER_365' },
  { days: 1000, type: 'TOGETHER_1000' },
];

/**
 * Quy ước đếm: ngày đón về = "ngày thứ 1" (giống các app "Been Together").
 * => mốc N ngày rơi vào adoptedAt + (N - 1).
 * Đổi thành false nếu khách hàng muốn đếm số ngày chênh lệch thuần (ngày đón về = 0).
 */
export const COUNT_ADOPTION_DAY_AS_DAY_ONE = true;

const OFFSET = COUNT_ADOPTION_DAY_AS_DAY_ONE ? 1 : 0;

export interface TogetherMilestoneInfo {
  type: MilestoneType;
  days: number;
  date: DateOnly;
  reached: boolean;
  daysLeft: number;
}

export type TogetherDaysResult =
  | { available: false; reason: 'NO_ADOPTED_DATE' | 'ADOPTED_IN_FUTURE'; today: DateOnly }
  | {
      available: true;
      adoptedAt: DateOnly;
      today: DateOnly;
      days: number;
      milestones: TogetherMilestoneInfo[];
      nextMilestone: TogetherMilestoneInfo | null;
    };

export function milestoneDate(adoptedAt: DateOnly, days: number): DateOnly {
  return addDays(adoptedAt, days - OFFSET);
}

/** Tính ngày đồng hành tại `today` (ngày lịch theo múi giờ của user). */
export function computeTogetherDays(adoptedAt: DateOnly | null, today: DateOnly): TogetherDaysResult {
  if (!adoptedAt) return { available: false, reason: 'NO_ADOPTED_DATE', today };
  if (adoptedAt > today) return { available: false, reason: 'ADOPTED_IN_FUTURE', today };

  const days = diffDays(adoptedAt, today) + OFFSET;
  const milestones = TOGETHER_MILESTONES.map(({ days: n, type }) => ({
    type,
    days: n,
    date: milestoneDate(adoptedAt, n),
    reached: days >= n,
    daysLeft: Math.max(0, n - days),
  }));

  return {
    available: true,
    adoptedAt,
    today,
    days,
    milestones,
    nextMilestone: milestones.find((m) => !m.reached) ?? null,
  };
}
