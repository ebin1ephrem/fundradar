import "server-only";
import type { Opportunity } from "@prisma/client";
import { Prisma } from "@prisma/client";

/** The fields worth waking an admin for. */
const WATCHED = [
  { field: "applicationDeadline", label: "Deadline" },
  { field: "applicationOpenDate", label: "Applications open" },
  { field: "isRollingDeadline", label: "Rolling deadline" },
  { field: "fundingMin", label: "Minimum funding" },
  { field: "fundingMax", label: "Maximum funding" },
  { field: "currency", label: "Currency" },
  { field: "eligibilitySummary", label: "Eligibility" },
  { field: "applicationUrl", label: "Application URL" },
  { field: "officialSourceUrl", label: "Official source URL" },
  { field: "benefitsSummary", label: "Benefits" },
  { field: "applicationProcess", label: "Application process" },
  { field: "requiredDocuments", label: "Required documents" },
  { field: "selectionProcess", label: "Selection process" },
  { field: "programmeStartDate", label: "Programme start" },
  { field: "programmeEndDate", label: "Programme end" },
  { field: "shortDescription", label: "Short description" },
] as const;

export type DetectedChange = {
  field: string;
  label: string;
  current: string | null;
  detected: string;
  confidence: number | null;
  evidence: string | null;
};

/**
 * Compares what a re-crawl found against the currently approved record. The
 * public record is never touched here — this only describes what changed, so an
 * admin can decide.
 */
export function detectChanges(
  current: Opportunity,
  draft: Record<string, unknown>,
  confidences: Map<string, { confidence: number | null; evidence: string | null }>,
): DetectedChange[] {
  const changes: DetectedChange[] = [];

  for (const { field, label } of WATCHED) {
    if (!(field in draft)) continue;

    const next = draft[field];
    const now = (current as unknown as Record<string, unknown>)[field];

    if (isSame(now, next)) continue;

    // Long prose reworded slightly is not a change worth reviewing.
    if (typeof next === "string" && typeof now === "string" && next.length > 120) {
      if (trivialTextChange(now, next)) continue;
    }

    const meta = confidences.get(field);
    changes.push({
      field,
      label,
      current: display(now),
      detected: display(next) ?? "",
      confidence: meta?.confidence ?? null,
      evidence: meta?.evidence ?? null,
    });
  }

  return changes;
}

function isSame(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;

  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Prisma.Decimal || b instanceof Prisma.Decimal) {
    return String(a) === String(b);
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return String(a).trim() === String(b).trim();
}

function display(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** Whitespace and punctuation churn on a long paragraph. */
function trivialTextChange(a: string, b: string): boolean {
  const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return clean(a) === clean(b);
}
