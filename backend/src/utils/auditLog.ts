import { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';

export interface AuditLogInput {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      oldValue: input.oldValue ?? Prisma.JsonNull,
      newValue: input.newValue ?? Prisma.JsonNull,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
