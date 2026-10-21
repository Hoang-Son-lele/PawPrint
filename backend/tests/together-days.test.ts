import { describe, expect, it } from 'vitest';
import { computeTogetherDays, milestoneDate } from '../src/modules/milestones/together-days';

describe('Together Days (FR-03)', () => {
  it('requires an adoption date', () => {
    expect(computeTogetherDays(null, '2026-10-20')).toMatchObject({ available: false, reason: 'NO_ADOPTED_DATE' });
  });

  it('rejects adoption dates in the future', () => {
    expect(computeTogetherDays('2026-10-21', '2026-10-20')).toMatchObject({
      available: false,
      reason: 'ADOPTED_IN_FUTURE',
    });
  });

  it('counts adoption day as day 1', () => {
    const r = computeTogetherDays('2026-10-20', '2026-10-20');
    expect(r.available && r.days).toBe(1);
  });

  it('marks 100-day milestone reached exactly on day 100', () => {
    const adopted = '2026-01-01';
    expect(milestoneDate(adopted, 100)).toBe('2026-04-10');

    const before = computeTogetherDays(adopted, '2026-04-09');
    const on = computeTogetherDays(adopted, '2026-04-10');
    if (!before.available || !on.available) throw new Error('should be available');

    expect(before.days).toBe(99);
    expect(before.nextMilestone).toMatchObject({ days: 100, daysLeft: 1, reached: false });
    expect(on.days).toBe(100);
    expect(on.milestones[0]).toMatchObject({ type: 'TOGETHER_100', reached: true, daysLeft: 0 });
    expect(on.nextMilestone).toMatchObject({ type: 'TOGETHER_365' });
  });

  it('returns no next milestone after 1000 days', () => {
    const r = computeTogetherDays('2020-01-01', '2026-10-20');
    if (!r.available) throw new Error('should be available');
    expect(r.milestones.every((m) => m.reached)).toBe(true);
    expect(r.nextMilestone).toBeNull();
  });
});
