import "server-only";
import type { Opportunity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canonicaliseUrl } from "./normalise";

export type DuplicateSignal = {
  name: string;
  weight: number;
  score: number;
  detail: string;
};

export type DuplicateMatch = {
  existing: Pick<
    Opportunity,
    | "id"
    | "slug"
    | "title"
    | "providerName"
    | "applicationDeadline"
    | "workflowStatus"
    | "fundingMax"
    | "currency"
    | "applicationUrl"
    | "officialSourceUrl"
  >;
  score: number;
  signals: DuplicateSignal[];
  /** Same programme, later year — a cohort, not a duplicate. */
  looksLikeNewCohort: boolean;
};

const CANDIDATE_LIMIT = 400;
const REPORT_THRESHOLD = 0.45;

/**
 * Compares a draft against published, pending and archived records alike.
 * Publishing the 2026 edition of a programme as if it were new is as damaging
 * as a true duplicate, so year differences are surfaced rather than scored away.
 */
export async function findDuplicates(candidate: {
  id?: string;
  title: string;
  providerName?: string | null;
  programmeName?: string | null;
  applicationUrl?: string | null;
  officialSourceUrl?: string | null;
  applicationDeadline?: Date | null;
  fundingMax?: unknown;
}): Promise<DuplicateMatch[]> {
  const existing = await prisma.opportunity.findMany({
    where: candidate.id ? { id: { not: candidate.id } } : {},
    orderBy: { updatedAt: "desc" },
    take: CANDIDATE_LIMIT,
    select: {
      id: true,
      slug: true,
      title: true,
      providerName: true,
      programmeName: true,
      applicationDeadline: true,
      workflowStatus: true,
      fundingMax: true,
      currency: true,
      applicationUrl: true,
      officialSourceUrl: true,
    },
  });

  const matches: DuplicateMatch[] = [];

  for (const row of existing) {
    const signals: DuplicateSignal[] = [];

    const titleScore = similarity(normaliseTitle(candidate.title), normaliseTitle(row.title));
    signals.push({
      name: "Title",
      weight: 0.4,
      score: titleScore,
      detail: `“${row.title}”`,
    });

    if (candidate.providerName && row.providerName) {
      const providerScore = similarity(
        normaliseTitle(candidate.providerName),
        normaliseTitle(row.providerName),
      );
      signals.push({
        name: "Provider",
        weight: 0.25,
        score: providerScore,
        detail: row.providerName,
      });
    }

    const urlScore = urlMatch(candidate, row);
    if (urlScore !== null) {
      signals.push({
        name: "Application or source URL",
        weight: 0.25,
        score: urlScore,
        detail: row.applicationUrl ?? row.officialSourceUrl ?? "",
      });
    }

    if (candidate.applicationDeadline && row.applicationDeadline) {
      const days = Math.abs(
        (candidate.applicationDeadline.getTime() - row.applicationDeadline.getTime()) / 86_400_000,
      );
      signals.push({
        name: "Deadline",
        weight: 0.1,
        score: days <= 1 ? 1 : days <= 14 ? 0.5 : 0,
        detail: row.applicationDeadline.toISOString().slice(0, 10),
      });
    }

    const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
    const score = signals.reduce((sum, s) => sum + s.weight * s.score, 0) / (totalWeight || 1);

    if (score < REPORT_THRESHOLD) continue;

    matches.push({
      existing: row,
      score,
      signals,
      looksLikeNewCohort: differentYear(candidate.title, row.title),
    });
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

function urlMatch(
  candidate: { applicationUrl?: string | null; officialSourceUrl?: string | null },
  row: { applicationUrl: string | null; officialSourceUrl: string | null },
): number | null {
  const left = [candidate.applicationUrl, candidate.officialSourceUrl]
    .map((u) => (u ? canonicaliseUrl(u) : null))
    .filter(Boolean) as string[];
  const right = [row.applicationUrl, row.officialSourceUrl]
    .map((u) => (u ? canonicaliseUrl(u) : null))
    .filter(Boolean) as string[];

  if (left.length === 0 || right.length === 0) return null;
  if (left.some((l) => right.includes(l))) return 1;

  const hosts = (urls: string[]) =>
    new Set(
      urls
        .map((u) => {
          try {
            return new URL(u).hostname;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as string[],
    );
  const leftHosts = hosts(left);
  const rightHosts = hosts(right);
  return [...leftHosts].some((h) => rightHosts.has(h)) ? 0.5 : 0;
}

const YEAR = /\b(20\d{2})\b/;

function differentYear(a: string, b: string): boolean {
  const yearA = a.match(YEAR)?.[1];
  const yearB = b.match(YEAR)?.[1];
  return Boolean(yearA && yearB && yearA !== yearB);
}

function normaliseTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(20\d{2})\b/g, " ")
    .replace(/\b(the|a|an|for|of|and|programme|program|edition|cohort|round)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Token overlap, which handles reordering better than edit distance. */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const left = new Set(a.split(/\s+/).filter((t) => t.length > 2));
  const right = new Set(b.split(/\s+/).filter((t) => t.length > 2));
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

/** Stable fingerprint used to remember rejected material across URLs. */
export function fingerprint(title: string, provider?: string | null): string {
  return `${normaliseTitle(title)}|${normaliseTitle(provider ?? "")}`.slice(0, 200);
}
