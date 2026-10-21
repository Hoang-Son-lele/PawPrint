import { describe, expect, it } from 'vitest';
import { buildPage, decodeCursor, encodeCursor } from '../src/common/utils/cursor';
import { AppError } from '../src/common/errors';

describe('cursor pagination', () => {
  it('round-trips a cursor', () => {
    const at = new Date('2026-10-20T10:00:00.123Z');
    const c = encodeCursor(at, 'abc');
    expect(decodeCursor(c)).toEqual({ at, id: 'abc' });
  });

  it('rejects malformed cursors', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(AppError);
  });

  it('builds next cursor only when there are more rows', () => {
    const rows = [1, 2, 3].map((i) => ({ id: `id${i}`, at: new Date(2026, 0, 10 - i) }));
    const full = buildPage(rows, 2, (r) => r.at);
    expect(full.rows).toHaveLength(2);
    expect(decodeCursor(full.nextCursor!)?.id).toBe('id2');

    const last = buildPage(rows.slice(0, 2), 2, (r) => r.at);
    expect(last.nextCursor).toBeNull();
  });
});
