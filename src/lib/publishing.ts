import "server-only";
import type { Opportunity } from "@prisma/client";

export type PublishRequirement = {
  key: string;
  label: string;
  /** Blocking requirements stop publication; advisory ones only warn. */
  blocking: boolean;
  met: boolean;
  detail?: string;
};

export type PublishCandidate = Pick<
  Opportunity,
  | "title"
  | "providerName"
  | "shortDescription"
  | "officialSourceUrl"
  | "applicationUrl"
  | "applicationInstructions"
  | "eligibilitySummary"
  | "applicationDeadline"
  | "isRollingDeadline"
  | "fundingMin"
  | "fundingMax"
  | "fundingAmountText"
  | "lastCheckedAt"
  | "lastVerifiedAt"
> & {
  categoryTypes: string[];
};

const filled = (v: unknown) =>
  typeof v === "string" ? v.trim().length > 0 : v !== null && v !== undefined;

/**
 * The publication contract from the spec. An opportunity cannot go public
 * without these. Where a provider genuinely does not state something, the
 * admin writes "Not specified by provider" rather than inventing a value.
 */
export function publishRequirements(
  candidate: PublishCandidate,
): PublishRequirement[] {
  const hasOpportunityType = candidate.categoryTypes.includes("OPPORTUNITY_TYPE");
  const hasAnyCategory = candidate.categoryTypes.length > 0;
  const hasStage = candidate.categoryTypes.includes("STARTUP_STAGE");
  const hasFunding =
    filled(candidate.fundingMin) ||
    filled(candidate.fundingMax) ||
    filled(candidate.fundingAmountText);

  return [
    {
      key: "title",
      label: "Opportunity title",
      blocking: true,
      met: filled(candidate.title),
    },
    {
      key: "provider",
      label: "Provider verified",
      blocking: true,
      met: filled(candidate.providerName),
    },
    {
      key: "opportunityType",
      label: "At least one opportunity type category",
      blocking: true,
      met: hasOpportunityType,
    },
    {
      key: "description",
      label: "Description written",
      blocking: true,
      met: filled(candidate.shortDescription),
    },
    {
      key: "officialSource",
      label: "Official source URL",
      blocking: true,
      met: filled(candidate.officialSourceUrl),
      detail: "Every published opportunity must point at its official source.",
    },
    {
      key: "application",
      label: "Application URL or written instructions",
      blocking: true,
      met: filled(candidate.applicationUrl) || filled(candidate.applicationInstructions),
    },
    {
      key: "eligibility",
      label: "Eligibility information",
      blocking: true,
      met: filled(candidate.eligibilitySummary),
    },
    {
      key: "deadline",
      label: "Deadline or rolling status",
      blocking: true,
      met: Boolean(candidate.applicationDeadline) || candidate.isRollingDeadline,
    },
    {
      key: "category",
      label: "At least one category assigned",
      blocking: true,
      met: hasAnyCategory,
    },
    {
      key: "lastChecked",
      label: "Source last checked date",
      blocking: true,
      met: Boolean(candidate.lastCheckedAt ?? candidate.lastVerifiedAt),
      detail: "Set when the source was last confirmed. Saving stamps it for you.",
    },
    {
      key: "funding",
      label: "Funding information",
      blocking: false,
      met: hasFunding,
      detail: "Publish without it only when the provider does not state an amount.",
    },
    {
      key: "stage",
      label: "Startup stage assigned",
      blocking: false,
      met: hasStage,
      detail: "Recommended wherever the programme states who it is for.",
    },
  ];
}

export function blockingFailures(
  requirements: PublishRequirement[],
): PublishRequirement[] {
  return requirements.filter((r) => r.blocking && !r.met);
}

export function canPublish(candidate: PublishCandidate): boolean {
  return blockingFailures(publishRequirements(candidate)).length === 0;
}
