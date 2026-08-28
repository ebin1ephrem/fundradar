import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Fields worth versioning. Counters and timestamps are deliberately excluded. */
const TRACKED_FIELDS = [
  "title",
  "providerName",
  "programmeName",
  "shortDescription",
  "fullDescription",
  "fundingMin",
  "fundingMax",
  "currency",
  "fundingAmountText",
  "isEquityFree",
  "fundingTypes",
  "applicationDeadline",
  "isRollingDeadline",
  "applicationOpenDate",
  "programmeStartDate",
  "programmeEndDate",
  "eligibilitySummary",
  "geographyScope",
  "country",
  "state",
  "city",
  "founderRequirements",
  "registrationRequirements",
  "revenueRequirement",
  "requiresDpiit",
  "requiresMsmeUdyam",
  "requiresStudentFounder",
  "requiresWomenFounder",
  "otherEligibility",
  "benefitsSummary",
  "applicationProcess",
  "requiredDocuments",
  "selectionProcess",
  "importantNotes",
  "applicationUrl",
  "applicationInstructions",
  "contactEmail",
  "officialSourceUrl",
  "workflowStatus",
  "lifecycleOverride",
  "isActive",
] as const;

type Snapshot = Record<string, unknown>;

export function snapshotOf(row: Record<string, unknown>): Snapshot {
  const out: Snapshot = {};
  for (const field of TRACKED_FIELDS) {
    const value = row[field];
    out[field] =
      value instanceof Date
        ? value.toISOString()
        : typeof value === "object" && value !== null && "toString" in value
          ? String(value)
          : (value as unknown);
  }
  return out;
}

export function diffFields(before: Snapshot, after: Snapshot): string[] {
  const changed: string[] = [];
  for (const field of TRACKED_FIELDS) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      changed.push(field);
    }
  }
  return changed;
}

/**
 * Writes an immutable snapshot. Grant data is never overwritten without a
 * record of what it used to be, who changed it and on whose authority.
 */
export async function recordVersion(options: {
  opportunityId: string;
  snapshot: Snapshot;
  changedFields: string[];
  changeSummary?: string | null;
  sourceUrl?: string | null;
  createdById?: string | null;
  approvedById?: string | null;
  tx?: Prisma.TransactionClient;
}): Promise<number> {
  const client = options.tx ?? prisma;
  const latest = await client.opportunityVersion.findFirst({
    where: { opportunityId: options.opportunityId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const versionNumber = (latest?.versionNumber ?? 0) + 1;

  await client.opportunityVersion.create({
    data: {
      opportunityId: options.opportunityId,
      versionNumber,
      snapshot: options.snapshot as Prisma.InputJsonValue,
      changedFields: options.changedFields,
      changeSummary: options.changeSummary ?? null,
      sourceUrl: options.sourceUrl ?? null,
      createdById: options.createdById ?? null,
      approvedById: options.approvedById ?? null,
      approvedAt: options.approvedById ? new Date() : null,
    },
  });

  return versionNumber;
}
