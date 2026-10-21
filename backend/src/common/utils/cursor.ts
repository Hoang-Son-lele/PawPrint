import { AppError } from '../errors';

/**
 * Keyset pagination cursor: sắp xếp (occurredAt DESC, id DESC).
 * Cursor là base64url của JSON {t: ISO string, id}.
 */
export interface CursorPayload {
  t: string;
  id: string;
}

export function encodeCursor(occurredAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: occurredAt.toISOString(), id })).toString('base64url');
}

export function decodeCursor(cursor?: string): { at: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
    const at = new Date(raw.t);
    if (Number.isNaN(at.getTime()) || typeof raw.id !== 'string') throw new Error('invalid');
    return { at, id: raw.id };
  } catch {
    throw AppError.badRequest('Cursor không hợp lệ');
  }
}

/** Điều kiện Prisma "sau cursor" theo thứ tự (field DESC, id DESC). */
export function afterCursorWhere<F extends string>(
  field: F,
  cursor: { at: Date; id: string } | null,
): Record<string, unknown> {
  if (!cursor) return {};
  return {
    OR: [{ [field]: { lt: cursor.at } }, { [field]: cursor.at, id: { lt: cursor.id } }],
  };
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Cắt danh sách đã lấy dư 1 phần tử và tính nextCursor. */
export function buildPage<T extends { id: string }>(
  rows: T[],
  limit: number,
  getAt: (row: T) => Date,
): { rows: T[]; nextCursor: string | null } {
  const hasMore = rows.length > limit;
  const sliced = hasMore ? rows.slice(0, limit) : rows;
  const last = sliced[sliced.length - 1];
  return { rows: sliced, nextCursor: hasMore && last ? encodeCursor(getAt(last), last.id) : null };
}
