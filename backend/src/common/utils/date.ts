/**
 * Tiện ích ngày/múi giờ.
 * - "DateOnly" là chuỗi YYYY-MM-DD (ngày lịch, không có giờ) – dùng cho birth_date, adopted_at,...
 * - Prisma trả cột DATE dưới dạng Date tại 00:00 UTC, nên chuyển đổi qua lại bằng UTC.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DateOnly = string;

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Ngày lịch hiện tại (hoặc của `at`) theo múi giờ IANA. */
export function localDateOf(at: Date, timeZone: string): DateOnly {
  // en-CA định dạng YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function todayIn(timeZone: string, now: Date = new Date()): DateOnly {
  return localDateOf(now, timeZone);
}

/** Giờ địa phương (0–23) tại thời điểm `at`. */
export function localHourOf(at: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(
    at,
  );
  return Number(h) % 24;
}

/** DateOnly -> Date (00:00 UTC) để ghi vào cột DATE qua Prisma. */
export function dateOnlyToDb(value: DateOnly): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Date (cột DATE từ Prisma) -> DateOnly. */
export function dbToDateOnly(value: Date): DateOnly {
  return value.toISOString().slice(0, 10);
}

export function addDays(value: DateOnly, days: number): DateOnly {
  return dbToDateOnly(new Date(dateOnlyToDb(value).getTime() + days * DAY_MS));
}

/** Số ngày từ `from` đến `to` (to - from). */
export function diffDays(from: DateOnly, to: DateOnly): number {
  return Math.round((dateOnlyToDb(to).getTime() - dateOnlyToDb(from).getTime()) / DAY_MS);
}

/** Offset (ms) của múi giờ tại thời điểm `at`: local = utc + offset. */
function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return asUtc - (at.getTime() - at.getMilliseconds());
}

/** Thời điểm UTC tương ứng 00:00 của ngày lịch `value` tại múi giờ `timeZone`. */
export function startOfLocalDay(value: DateOnly, timeZone: string): Date {
  const guess = dateOnlyToDb(value).getTime();
  let result = guess - tzOffsetMs(new Date(guess), timeZone);
  // tinh chỉnh lần 2 cho trường hợp đổi giờ DST
  result = guess - tzOffsetMs(new Date(result), timeZone);
  return new Date(result);
}
