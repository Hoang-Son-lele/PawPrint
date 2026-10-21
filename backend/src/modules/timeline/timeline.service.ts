import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { decodeCursor, encodeCursor, afterCursorWhere } from '../../common/utils/cursor';
import {
  dateOnlyToDb,
  localDateOf,
  startOfLocalDay,
  todayIn,
  type DateOnly,
} from '../../common/utils/date';
import { getOwnedPetIds } from '../pets/pets.access';
import { getUserTimeZone } from '../users/users.helpers';
import { toMomentDto } from '../moments/moments.service';
import { toCareRecordDto, localRangeWhere } from '../care-records/care-records.service';
import { toMilestoneDto } from '../milestones/milestones.service';
import { TIMELINE_KINDS, type TimelineKind, type TimelineQuery } from './timeline.schema';

export interface TimelineItem {
  kind: TimelineKind;
  id: string;
  petId: string;
  occurredAt: Date;
  /** Ngày lịch theo múi giờ user – client dùng để nhóm theo ngày/tháng/năm */
  localDate: DateOnly;
  data: unknown;
}

/** Thứ tự (occurredAt DESC, id DESC) – trùng với ORDER BY trong DB (collation binary). */
const compareDesc = (a: TimelineItem, b: TimelineItem) =>
  b.occurredAt.getTime() - a.occurredAt.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

/**
 * Milestone chỉ có ngày (DATE) -> quy về 00:00 theo múi giờ user.
 * Điều kiện "sau cursor" tương đương trên cột milestone_date.
 */
function milestoneAfterCursor(cursor: { at: Date; id: string } | null, tz: string): Prisma.MilestoneWhereInput {
  if (!cursor) return {};
  const cd = localDateOf(cursor.at, tz);
  const dayStart = startOfLocalDay(cd, tz);
  if (cursor.at.getTime() > dayStart.getTime()) return { milestoneDate: { lte: dateOnlyToDb(cd) } };
  return {
    OR: [
      { milestoneDate: { lt: dateOnlyToDb(cd) } },
      { milestoneDate: dateOnlyToDb(cd), id: { lt: cursor.id } },
    ],
  };
}

export async function getTimeline(userId: string, petIds: string[] | undefined, q: TimelineQuery) {
  const ownedPetIds = await getOwnedPetIds(userId, petIds);
  if (!ownedPetIds.length) return { items: [], nextCursor: null };

  const tz = await getUserTimeZone(userId);
  const cursor = decodeCursor(q.cursor);
  const kinds = new Set<TimelineKind>(q.kinds?.length ? q.kinds : TIMELINE_KINDS);
  const take = q.limit + 1;
  const range = localRangeWhere(q.from, q.to, tz);
  const today = todayIn(tz);
  // milestone: chỉ hiển thị mốc đã tới (<= hôm nay) và trong khoảng lọc
  const msTo = q.to && q.to < today ? q.to : today;

  const [moments, careRecords, milestones] = await Promise.all([
    kinds.has('MOMENT')
      ? prisma.moment.findMany({
          where: {
            petId: { in: ownedPetIds },
            deletedAt: null,
            AND: [range ? { occurredAt: range } : {}, afterCursorWhere('occurredAt', cursor)],
          },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take,
          include: { media: { orderBy: { sortOrder: 'asc' } } },
        })
      : [],
    kinds.has('CARE')
      ? prisma.careRecord.findMany({
          where: {
            petId: { in: ownedPetIds },
            deletedAt: null,
            ...(q.careTypes?.length && { type: { in: q.careTypes } }),
            AND: [range ? { occurredAt: range } : {}, afterCursorWhere('occurredAt', cursor)],
          },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take,
        })
      : [],
    kinds.has('MILESTONE')
      ? prisma.milestone.findMany({
          where: {
            petId: { in: ownedPetIds },
            deletedAt: null,
            AND: [
              {
                milestoneDate: {
                  lte: dateOnlyToDb(msTo),
                  ...(q.from && { gte: dateOnlyToDb(q.from) }),
                },
              },
              milestoneAfterCursor(cursor, tz),
            ],
          },
          orderBy: [{ milestoneDate: 'desc' }, { id: 'desc' }],
          take,
        })
      : [],
  ]);

  const items: TimelineItem[] = [
    ...moments.map((m) => ({
      kind: 'MOMENT' as const,
      id: m.id,
      petId: m.petId,
      occurredAt: m.occurredAt,
      localDate: localDateOf(m.occurredAt, tz),
      data: toMomentDto(m, tz),
    })),
    ...careRecords.map((r) => ({
      kind: 'CARE' as const,
      id: r.id,
      petId: r.petId,
      occurredAt: r.occurredAt,
      localDate: localDateOf(r.occurredAt, tz),
      data: toCareRecordDto(r, tz),
    })),
    ...milestones.map((m) => {
      const dto = toMilestoneDto(m);
      return {
        kind: 'MILESTONE' as const,
        id: m.id,
        petId: m.petId,
        occurredAt: startOfLocalDay(dto.date, tz),
        localDate: dto.date,
        data: dto,
      };
    }),
  ].sort(compareDesc);

  const page = items.slice(0, q.limit);
  const last = page[page.length - 1];
  return {
    items: page,
    nextCursor: items.length > q.limit && last ? encodeCursor(last.occurredAt, last.id) : null,
  };
}
