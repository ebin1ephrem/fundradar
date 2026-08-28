import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Every admin mutation is recorded. Publishing decisions in particular must be
 * attributable — see docs/ARCHITECTURE.md "Approval workflow".
 */
export async function audit(entry: {
  adminUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId: entry.adminUserId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary ?? null,
        before: entry.before ?? undefined,
        after: entry.after ?? undefined,
      },
    });
  } catch {
    // Audit must never break the operation it is recording.
  }
}
