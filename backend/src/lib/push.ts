import { env } from '../config/env';
import { logger } from './logger';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushProvider {
  /** Gửi tới danh sách device token; trả về các token không còn hợp lệ (để xoá). */
  send(tokens: string[], message: PushMessage): Promise<{ invalidTokens: string[] }>;
}

/** MVP: chỉ ghi log. Thay bằng FCM HTTP v1 (firebase-admin) khi có service account. */
class LogPushProvider implements PushProvider {
  async send(tokens: string[], message: PushMessage) {
    logger.info({ tokens: tokens.length, message }, '🔔 [PUSH:log]');
    return { invalidTokens: [] };
  }
}

function createProvider(): PushProvider {
  if (env.PUSH_PROVIDER === 'fcm') {
    logger.warn('PUSH_PROVIDER=fcm chưa được triển khai – dùng log provider');
  }
  return new LogPushProvider();
}

export const pushProvider: PushProvider = createProvider();
