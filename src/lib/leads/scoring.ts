import "server-only";
import type { Lead, LeadStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Scores are recomputed from stored state rather than incremented as events
 * arrive, so a replayed event or a failed write can never inflate a lead.
 */
export const SCORE_RULES = [
  { key: "submitted", label: "Gave their details", points: 10 },
  { key: "viewedThree", label: "Viewed 3 or more opportunities", points: 5 },
  { key: "saved", label: "Saved an opportunity", points: 10 },
  { key: "reminder", label: "Asked for a deadline reminder", points: 10 },
  { key: "industry", label: "Told us their industry", points: 5 },
  { key: "website", label: "Added their website", points: 5 },
  { key: "matches", label: "Asked for funding matches", points: 15 },
  { key: "stage", label: "Told us their stage", points: 5 },
  { key: "location", label: "Told us where they are", points: 5 },
  { key: "requirement", label: "Told us how much they need", points: 10 },
] as const;

export type ScoreRuleKey = (typeof SCORE_RULES)[number]["key"];

export const MAX_SCORE = SCORE_RULES.reduce((sum, r) => sum + r.points, 0);

/** Fields that make up a complete startup profile, for the completion meter. */
const PROFILE_FIELDS: (keyof Lead)[] = [
  "name",
  "email",
  "whatsapp",
  "startupName",
  "website",
  "linkedinUrl",
  "city",
  "state",
  "industryCategoryId",
  "stageCategoryId",
  "yearFounded",
  "teamSize",
  "revenueRange",
  "fundingRaised",
  "fundingRequirementMax",
  "dpiitStatus",
];

export function profileCompletion(lead: Lead): number {
  const filled = PROFILE_FIELDS.filter((field) => {
    const value = lead[field];
    return value !== null && value !== undefined && value !== "";
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

export function leadStageFor(score: number, completion: number): LeadStage {
  if (completion >= 70 && score >= 45) return "ACTIVE_STARTUP";
  if (score >= 30) return "REGISTERED_USER";
  if (score >= 20) return "ENGAGED_LEAD";
  return "LEAD";
}

export type ScoreBreakdown = {
  score: number;
  completion: number;
  stage: LeadStage;
  earned: { key: ScoreRuleKey; label: string; points: number }[];
};

export async function computeLeadScore(leadId: string): Promise<ScoreBreakdown | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      _count: { select: { saved: true, subscriptions: true } },
    },
  });
  if (!lead) return null;

  const [viewCount, reminderCount, matchCount] = await Promise.all([
    prisma.leadActivity.count({
      where: { leadId, type: "opportunity_view" },
    }),
    prisma.leadActivity.count({ where: { leadId, type: "reminder_requested" } }),
    prisma.leadActivity.count({ where: { leadId, type: "matches_requested" } }),
  ]);

  const met: Record<ScoreRuleKey, boolean> = {
    submitted: true,
    viewedThree: viewCount >= 3,
    saved: lead._count.saved > 0,
    reminder: reminderCount > 0 || lead._count.subscriptions > 0,
    industry: Boolean(lead.industryCategoryId),
    website: Boolean(lead.website),
    matches: matchCount > 0,
    stage: Boolean(lead.stageCategoryId),
    location: Boolean(lead.city || lead.state),
    requirement: Boolean(lead.fundingRequirementMax),
  };

  const earned = SCORE_RULES.filter((rule) => met[rule.key]).map((rule) => ({
    key: rule.key,
    label: rule.label,
    points: rule.points,
  }));
  const score = earned.reduce((sum, rule) => sum + rule.points, 0);
  const completion = profileCompletion(lead);

  return { score, completion, stage: leadStageFor(score, completion), earned };
}

/** Recomputes and persists. Safe to call after any lead-affecting action. */
export async function refreshLead(leadId: string): Promise<void> {
  const breakdown = await computeLeadScore(leadId);
  if (!breakdown) return;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      leadScore: breakdown.score,
      profileCompletion: breakdown.completion,
      leadStage: breakdown.stage,
      lastActivityAt: new Date(),
    },
  });
}
