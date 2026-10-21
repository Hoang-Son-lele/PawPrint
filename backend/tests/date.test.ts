import { describe, expect, it } from 'vitest';
import {
  addDays,
  diffDays,
  isValidDateOnly,
  isValidTimeZone,
  localDateOf,
  localHourOf,
  startOfLocalDay,
  todayIn,
} from '../src/common/utils/date';

describe('date utils', () => {
  it('validates YYYY-MM-DD strictly', () => {
    expect(isValidDateOnly('2026-02-28')).toBe(true);
    expect(isValidDateOnly('2026-02-30')).toBe(false);
    expect(isValidDateOnly('2026-2-3')).toBe(false);
    expect(isValidDateOnly('2024-02-29')).toBe(true);
  });

  it('validates IANA time zones', () => {
    expect(isValidTimeZone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(isValidTimeZone('Mars/Base')).toBe(false);
  });

  it('computes local date across the UTC day boundary', () => {
    // 2026-10-20 18:30 UTC = 2026-10-21 01:30 tại Việt Nam (UTC+7)
    const at = new Date('2026-10-20T18:30:00Z');
    expect(localDateOf(at, 'Asia/Ho_Chi_Minh')).toBe('2026-10-21');
    expect(localDateOf(at, 'America/Los_Angeles')).toBe('2026-10-20');
    expect(todayIn('UTC', at)).toBe('2026-10-20');
    expect(localHourOf(at, 'Asia/Ho_Chi_Minh')).toBe(1);
  });

  it('adds and diffs days including leap years', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-01-01', '2026-12-31')).toBe(364);
    expect(diffDays('2026-03-01', '2026-02-01')).toBe(-28);
  });

  it('converts local midnight to UTC', () => {
    expect(startOfLocalDay('2026-10-21', 'Asia/Ho_Chi_Minh').toISOString()).toBe('2026-10-20T17:00:00.000Z');
    expect(startOfLocalDay('2026-10-21', 'UTC').toISOString()).toBe('2026-10-21T00:00:00.000Z');
    // New York sau khi kết thúc DST (UTC-5)
    expect(startOfLocalDay('2026-11-02', 'America/New_York').toISOString()).toBe('2026-11-02T05:00:00.000Z');
    // New York trong DST (UTC-4)
    expect(startOfLocalDay('2026-07-01', 'America/New_York').toISOString()).toBe('2026-07-01T04:00:00.000Z');
  });
});
