import { z } from "zod";

/**
 * The canonical field set every ingestion route extracts into. One schema for
 * pasted text, a single URL and a crawled page — there is deliberately no
 * separate "AI schema" and "manual schema".
 *
 * Names match Opportunity columns so mapping a draft is mechanical.
 */
export const EXTRACTION_FIELDS = [
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
  "equityPercentage",
  "applicationDeadline",
  "isRollingDeadline",
  "applicationOpenDate",
  "programmeStartDate",
  "programmeEndDate",
  "eligibilitySummary",
  "companyTypes",
  "incorporationAgeMinMonths",
  "incorporationAgeMaxMonths",
  "technologies",
  "geographyScope",
  "country",
  "state",
  "city",
  "founderRequirements",
  "registrationRequirements",
  "revenueRequirement",
  "previousFundingLimit",
  "requiresDpiit",
  "requiresMsmeUdyam",
  "requiresStudentFounder",
  "requiresWomenFounder",
  "otherEligibility",
  "benefitsSummary",
  "offersMentoring",
  "offersIncubation",
  "offersNetworking",
  "offersInvestorAccess",
  "offersLabAccess",
  "offersPilotOpportunities",
  "offersCorporatePartnerships",
  "offersMarketAccess",
  "applicationProcess",
  "requiredDocuments",
  "selectionProcess",
  "importantNotes",
  "applicationUrl",
  "applicationInstructions",
  "contactEmail",
  "contactPhone",
  "officialSourceUrl",
  "providerSector",
] as const;

export type ExtractionField = (typeof EXTRACTION_FIELDS)[number];

/** Human labels for the "information we could not confirm" panel. */
export const FIELD_LABEL: Record<ExtractionField, string> = {
  title: "Opportunity title",
  providerName: "Provider",
  programmeName: "Programme name",
  shortDescription: "Short description",
  fullDescription: "Full description",
  fundingMin: "Minimum funding",
  fundingMax: "Maximum funding",
  currency: "Currency",
  fundingAmountText: "Funding, as worded",
  isEquityFree: "Equity-free",
  equityPercentage: "Equity taken",
  applicationDeadline: "Application deadline",
  isRollingDeadline: "Rolling deadline",
  applicationOpenDate: "Applications open",
  programmeStartDate: "Programme start",
  programmeEndDate: "Programme end",
  eligibilitySummary: "Eligibility",
  companyTypes: "Eligible entity types",
  incorporationAgeMinMonths: "Minimum company age",
  incorporationAgeMaxMonths: "Maximum company age",
  technologies: "Technologies",
  geographyScope: "Geographic scope",
  country: "Country",
  state: "State",
  city: "City",
  founderRequirements: "Founder requirements",
  registrationRequirements: "Registration requirements",
  revenueRequirement: "Revenue requirements",
  previousFundingLimit: "Limits on funding raised",
  requiresDpiit: "DPIIT requirement",
  requiresMsmeUdyam: "MSME / Udyam requirement",
  requiresStudentFounder: "Student founder requirement",
  requiresWomenFounder: "Women founder requirement",
  otherEligibility: "Other eligibility",
  benefitsSummary: "Benefits",
  offersMentoring: "Mentoring",
  offersIncubation: "Incubation",
  offersNetworking: "Networking",
  offersInvestorAccess: "Investor access",
  offersLabAccess: "Lab access",
  offersPilotOpportunities: "Pilot opportunities",
  offersCorporatePartnerships: "Corporate partnerships",
  offersMarketAccess: "Market access",
  applicationProcess: "Application process",
  requiredDocuments: "Required documents",
  selectionProcess: "Selection process",
  importantNotes: "Important notes",
  applicationUrl: "Application URL",
  applicationInstructions: "Application instructions",
  contactEmail: "Contact email",
  contactPhone: "Contact phone",
  officialSourceUrl: "Official source URL",
  providerSector: "Provider type",
};

/** Fields worth listing when absent. The rest are noise in a review screen. */
export const IMPORTANT_FIELDS: ExtractionField[] = [
  "providerName",
  "fundingMax",
  "applicationDeadline",
  "applicationOpenDate",
  "eligibilitySummary",
  "state",
  "requiresDpiit",
  "applicationUrl",
  "programmeStartDate",
  "equityPercentage",
];

export const CLASSIFICATIONS = [
  "GRANT",
  "SEED_FUND",
  "INCUBATION_PROGRAM",
  "ACCELERATION_PROGRAM",
  "CSR_FUNDING",
  "CORPORATE_INNOVATION",
  "AWARD_OR_COMPETITION",
  "FELLOWSHIP",
  "PILOT_OPPORTUNITY",
  "MARKET_ACCESS",
  "PROCUREMENT_OPPORTUNITY",
  "POSSIBLE_FUNDING_OPPORTUNITY",
  "EVENT",
  "NEWS_OR_ARTICLE",
  "GENERAL_INFORMATION",
  "NOT_AN_OPPORTUNITY",
  "UNKNOWN",
] as const;

/**
 * A flat list of fields rather than one deep object: it keeps the response
 * schema small, maps one-to-one onto FieldExtraction rows, and makes "this was
 * never stated" an explicit entry instead of an absent key.
 */
export const ExtractionSchema = z.object({
  classification: z.object({
    kind: z.enum(CLASSIFICATIONS),
    confidence: z.number().min(0).max(1),
    reason: z.string(),
  }),
  fields: z.array(
    z.object({
      name: z.enum(EXTRACTION_FIELDS),
      value: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.string(),
    }),
  ),
  unknownFields: z.array(z.enum(EXTRACTION_FIELDS)),
  categorySuggestions: z.array(
    z.object({
      slug: z.string(),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
    }),
  ),
  newCategorySuggestions: z.array(
    z.object({ name: z.string(), reason: z.string() }),
  ),
});

export type ExtractionOutput = z.infer<typeof ExtractionSchema>;
