import type { Opportunity } from "@prisma/client";
import { BENEFIT_FIELDS } from "@/lib/validation/opportunity";

/**
 * Prisma rows carry Decimal instances and Date objects, neither of which can
 * cross into a client component — React serialises them into something the
 * form cannot use, and the submit fails silently.
 *
 * Everything the form needs is projected to primitives here instead.
 */
export type OpportunityFormValues = {
  id: string;
  title: string;
  slug: string;
  providerName: string;
  providerLogoUrl: string;
  programmeName: string;
  providerSector: string;
  shortDescription: string;
  fullDescription: string;
  fundingMin: string;
  fundingMax: string;
  currency: string;
  fundingAmountText: string;
  isEquityFree: "yes" | "no" | "unknown";
  fundingTypes: string[];
  applicationDeadline: string;
  isRollingDeadline: boolean;
  applicationOpenDate: string;
  programmeStartDate: string;
  programmeEndDate: string;
  eligibilitySummary: string;
  incorporationAgeMinMonths: string;
  incorporationAgeMaxMonths: string;
  companyTypes: string;
  technologies: string;
  geographyScope: string;
  country: string;
  state: string;
  city: string;
  founderRequirements: string;
  registrationRequirements: string;
  revenueRequirement: string;
  previousFundingLimit: string;
  requiresDpiit: "yes" | "no" | "unknown";
  requiresMsmeUdyam: "yes" | "no" | "unknown";
  requiresStudentFounder: "yes" | "no" | "unknown";
  requiresWomenFounder: "yes" | "no" | "unknown";
  otherEligibility: string;
  benefitsSummary: string;
  benefits: Record<string, boolean>;
  applicationProcess: string;
  requiredDocuments: string;
  selectionProcess: string;
  importantNotes: string;
  applicationUrl: string;
  applicationInstructions: string;
  contactEmail: string;
  officialSourceUrl: string;
  seoTitle: string;
  seoDescription: string;
};

const text = (value: string | null | undefined) => value ?? "";
const num = (value: { toString(): string } | number | null | undefined) =>
  value === null || value === undefined ? "" : value.toString();
const date = (value: Date | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";
const tri = (value: boolean | null | undefined): "yes" | "no" | "unknown" =>
  value === null || value === undefined ? "unknown" : value ? "yes" : "no";

export function toFormValues(row: Opportunity): OpportunityFormValues {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    providerName: row.providerName,
    providerLogoUrl: text(row.providerLogoUrl),
    programmeName: text(row.programmeName),
    providerSector: text(row.providerSector),
    shortDescription: row.shortDescription,
    fullDescription: text(row.fullDescription),
    fundingMin: num(row.fundingMin),
    fundingMax: num(row.fundingMax),
    currency: row.currency,
    fundingAmountText: text(row.fundingAmountText),
    isEquityFree: tri(row.isEquityFree),
    fundingTypes: [...row.fundingTypes],
    applicationDeadline: date(row.applicationDeadline),
    isRollingDeadline: row.isRollingDeadline,
    applicationOpenDate: date(row.applicationOpenDate),
    programmeStartDate: date(row.programmeStartDate),
    programmeEndDate: date(row.programmeEndDate),
    eligibilitySummary: text(row.eligibilitySummary),
    incorporationAgeMinMonths: num(row.incorporationAgeMinMonths),
    incorporationAgeMaxMonths: num(row.incorporationAgeMaxMonths),
    companyTypes: row.companyTypes.join(", "),
    technologies: row.technologies.join(", "),
    geographyScope: row.geographyScope,
    country: text(row.country),
    state: text(row.state),
    city: text(row.city),
    founderRequirements: text(row.founderRequirements),
    registrationRequirements: text(row.registrationRequirements),
    revenueRequirement: text(row.revenueRequirement),
    previousFundingLimit: text(row.previousFundingLimit),
    requiresDpiit: tri(row.requiresDpiit),
    requiresMsmeUdyam: tri(row.requiresMsmeUdyam),
    requiresStudentFounder: tri(row.requiresStudentFounder),
    requiresWomenFounder: tri(row.requiresWomenFounder),
    otherEligibility: text(row.otherEligibility),
    benefitsSummary: text(row.benefitsSummary),
    benefits: Object.fromEntries(
      BENEFIT_FIELDS.map((benefit) => [
        benefit.name,
        Boolean(row[benefit.name as keyof Opportunity]),
      ]),
    ),
    applicationProcess: text(row.applicationProcess),
    requiredDocuments: text(row.requiredDocuments),
    selectionProcess: text(row.selectionProcess),
    importantNotes: text(row.importantNotes),
    applicationUrl: text(row.applicationUrl),
    applicationInstructions: text(row.applicationInstructions),
    contactEmail: text(row.contactEmail),
    officialSourceUrl: row.officialSourceUrl,
    seoTitle: text(row.seoTitle),
    seoDescription: text(row.seoDescription),
  };
}
