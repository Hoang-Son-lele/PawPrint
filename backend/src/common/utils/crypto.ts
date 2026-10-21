import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const newId = (): string => randomUUID();

/** Token ngẫu nhiên an toàn (gửi cho client). */
export const randomToken = (bytes = 48): string => randomBytes(bytes).toString('base64url');

/** Hash một chiều để lưu DB (không lưu token gốc). */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
