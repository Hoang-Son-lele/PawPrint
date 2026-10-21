import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { logger } from './logger';
import { newId } from '../common/utils/crypto';

export interface AuditEntry {
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  req?: Request;
}

/** Ghi audit log – không bao giờ làm hỏng request chính. */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: newId(),
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadataJson: entry.metadata,
        ipAddress: entry.req?.ip?.slice(0, 45),
        userAgent: entry.req?.get('user-agent')?.slice(0, 255),
      },
    });
  } catch (err) {
    logger.warn({ err, action: entry.action }, 'Ghi audit log thất bại');
  }
}
