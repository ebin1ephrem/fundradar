import { z } from "zod";
import { FundingType, GeographyScope, ProviderSector } from "@prisma/client";

const trimmed = z.string().trim();

const nullableText = trimmed
  .transform((v) => (v.length ? v : null))
  .nullable()
  .default(null);

const nullableUrl = trimmed
  .transform((v) => (v.length ? v : null))
  .nullable()
  .default(null)
  .refine(
    (v) => v === null || /^https?:\/\/\S+\.\S+/i.test(v),
    "Enter a full URL starting with http:// or https://",
  );

const nullableEmail = trimmed
  .toLowerCase()
  .transform((v) => (v.length ? v : null))
  .nullable()
  .default(null)
  .refine(
    (v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    "Enter a valid email address",
  );

const nullableDate = trimmed
  .transform((v) => (v.length ? new Date(`${v}T00:00:00.000Z`) : null))
  .nullable()
  .default(null)
  .refine((v) => v === null || !Number.isNaN(v.getTime()), "Enter a valid date");

const nullableNumber = z
  .union([z.string(), z.number()])
  .transform((v) => {
    const raw = typeof v === "number" ? String(v) : v.trim().replace(/[, ]/g, "");
    if (!raw.length) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : Number.NaN;
  })
  .nullable()
  .default(null)
  .refine((v) => v === null || !Number.isNaN(v), "Enter a number")
  .refine((v) => v === null || v >= 0, "Cannot be negative");

const nullableInt = nullableNumber.refine(
  (v) => v === null || Number.isInteger(v),
  "Enter a whole number",
);

/** Radio group with an explicit "provider does not say" option. */
const triState = z
  .enum(["yes", "no", "unknown"])
  .default("unknown")
  .transform((v) => (v === "unknown" ? null : v === "yes"));

export const OpportunityInput = z
  .object({
    title: trimmed.min(4, "Title must be at least 4 characters").max(220),
    slug: trimmed
      .toLowerCase()
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only")
      .or(z.literal("")),
    providerName: trimmed.min(2, "Provider is required").max(180),
    providerLogoUrl: nullableUrl,
    programmeName: nullableText,
    providerSector: z
      .union([z.nativeEnum(ProviderSector), z.literal("")])
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .default(null),

    shortDescription: trimmed
      .min(30, "Write at least a sentence — this is the public summary")
      .max(400),
    fullDescription: nullableText,

    fundingMin: nullableNumber,
    fundingMax: nullableNumber,
    currency: trimmed.length(3, "Use a 3-letter currency code").default("INR"),
    fundingAmountText: nullableText,
    isEquityFree: triState,
    fundingTypes: z.array(z.nativeEnum(FundingType)).default([]),

    applicationDeadline: nullableDate,
    isRollingDeadline: z.coerce.boolean().default(false),
    applicationOpenDate: nullableDate,
    programmeStartDate: nullableDate,
    programmeEndDate: nullableDate,

    eligibilitySummary: nullableText,
    incorporationAgeMinMonths: nullableInt,
    incorporationAgeMaxMonths: nullableInt,
    companyTypes: z.array(trimmed).default([]),
    technologies: z.array(trimmed).default([]),
    geographyScope: z.nativeEnum(GeographyScope).default("PAN_INDIA"),
    country: nullableText,
    state: nullableText,
    city: nullableText,
    founderRequirements: nullableText,
    registrationRequirements: nullableText,
    revenueRequirement: nullableText,
    previousFundingLimit: nullableText,
    requiresDpiit: triState,
    requiresMsmeUdyam: triState,
    requiresStudentFounder: triState,
    requiresWomenFounder: triState,
    otherEligibility: nullableText,

    benefitsSummary: nullableText,
    offersMentoring: z.coerce.boolean().default(false),
    offersIncubation: z.coerce.boolean().default(false),
    offersNetworking: z.coerce.boolean().default(false),
    offersInvestorAccess: z.coerce.boolean().default(false),
    offersLabAccess: z.coerce.boolean().default(false),
    offersPilotOpportunities: z.coerce.boolean().default(false),
    offersCorporatePartnerships: z.coerce.boolean().default(false),
    offersMarketAccess: z.coerce.boolean().default(false),

    applicationProcess: nullableText,
    requiredDocuments: nullableText,
    selectionProcess: nullableText,
    importantNotes: nullableText,

    applicationUrl: nullableUrl,
    applicationInstructions: nullableText,
    contactEmail: nullableEmail,
    officialSourceUrl: trimmed
      .min(1, "An official source URL is required")
      .refine(
        (v) => /^https?:\/\/\S+\.\S+/i.test(v),
        "Enter a full URL starting with http:// or https://",
      ),

    seoTitle: nullableText,
    seoDescription: nullableText,

    categoryIds: z.array(trimmed).default([]),
    primaryCategoryId: nullableText,
  })
  .refine(
    (v) =>
      v.fundingMin === null ||
      v.fundingMax === null ||
      v.fundingMin <= v.fundingMax,
    { message: "Minimum funding cannot exceed maximum", path: ["fundingMin"] },
  )
  .refine(
    (v) =>
      v.applicationOpenDate === null ||
      v.applicationDeadline === null ||
      v.applicationOpenDate <= v.applicationDeadline,
    { message: "Opening date must fall before the deadline", path: ["applicationOpenDate"] },
  )
  .refine((v) => v.isRollingDeadline || v.applicationDeadline !== null, {
    message: "Set a deadline, or mark the programme as rolling",
    path: ["applicationDeadline"],
  });

export type OpportunityInputType = z.infer<typeof OpportunityInput>;

function list(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

function csv(formData: FormData, name: string): string[] {
  return String(formData.get(name) ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

const on = (formData: FormData, name: string) => formData.get(name) === "on";
const str = (formData: FormData, name: string) => formData.get(name) ?? "";

export function readOpportunityForm(formData: FormData) {
  return {
    title: str(formData, "title"),
    slug: str(formData, "slug"),
    providerName: str(formData, "providerName"),
    providerLogoUrl: str(formData, "providerLogoUrl"),
    programmeName: str(formData, "programmeName"),
    providerSector: str(formData, "providerSector"),

    shortDescription: str(formData, "shortDescription"),
    fullDescription: str(formData, "fullDescription"),

    fundingMin: str(formData, "fundingMin"),
    fundingMax: str(formData, "fundingMax"),
    currency: String(str(formData, "currency") || "INR").toUpperCase(),
    fundingAmountText: str(formData, "fundingAmountText"),
    isEquityFree: str(formData, "isEquityFree") || "unknown",
    fundingTypes: list(formData, "fundingTypes"),

    applicationDeadline: str(formData, "applicationDeadline"),
    isRollingDeadline: on(formData, "isRollingDeadline"),
    applicationOpenDate: str(formData, "applicationOpenDate"),
    programmeStartDate: str(formData, "programmeStartDate"),
    programmeEndDate: str(formData, "programmeEndDate"),

    eligibilitySummary: str(formData, "eligibilitySummary"),
    incorporationAgeMinMonths: str(formData, "incorporationAgeMinMonths"),
    incorporationAgeMaxMonths: str(formData, "incorporationAgeMaxMonths"),
    companyTypes: csv(formData, "companyTypes"),
    technologies: csv(formData, "technologies"),
    geographyScope: str(formData, "geographyScope") || "PAN_INDIA",
    country: str(formData, "country"),
    state: str(formData, "state"),
    city: str(formData, "city"),
    founderRequirements: str(formData, "founderRequirements"),
    registrationRequirements: str(formData, "registrationRequirements"),
    revenueRequirement: str(formData, "revenueRequirement"),
    previousFundingLimit: str(formData, "previousFundingLimit"),
    requiresDpiit: str(formData, "requiresDpiit") || "unknown",
    requiresMsmeUdyam: str(formData, "requiresMsmeUdyam") || "unknown",
    requiresStudentFounder: str(formData, "requiresStudentFounder") || "unknown",
    requiresWomenFounder: str(formData, "requiresWomenFounder") || "unknown",
    otherEligibility: str(formData, "otherEligibility"),

    benefitsSummary: str(formData, "benefitsSummary"),
    offersMentoring: on(formData, "offersMentoring"),
    offersIncubation: on(formData, "offersIncubation"),
    offersNetworking: on(formData, "offersNetworking"),
    offersInvestorAccess: on(formData, "offersInvestorAccess"),
    offersLabAccess: on(formData, "offersLabAccess"),
    offersPilotOpportunities: on(formData, "offersPilotOpportunities"),
    offersCorporatePartnerships: on(formData, "offersCorporatePartnerships"),
    offersMarketAccess: on(formData, "offersMarketAccess"),

    applicationProcess: str(formData, "applicationProcess"),
    requiredDocuments: str(formData, "requiredDocuments"),
    selectionProcess: str(formData, "selectionProcess"),
    importantNotes: str(formData, "importantNotes"),

    applicationUrl: str(formData, "applicationUrl"),
    applicationInstructions: str(formData, "applicationInstructions"),
    contactEmail: str(formData, "contactEmail"),
    officialSourceUrl: str(formData, "officialSourceUrl"),

    seoTitle: str(formData, "seoTitle"),
    seoDescription: str(formData, "seoDescription"),

    categoryIds: list(formData, "categoryIds"),
    primaryCategoryId: str(formData, "primaryCategoryId"),
  };
}

export const FUNDING_TYPE_LABEL: Record<FundingType, string> = {
  GRANT: "Grant",
  EQUITY_FUNDING: "Equity funding",
  EQUITY_FREE: "Equity-free",
  ACCELERATOR: "Accelerator funding",
  INCUBATOR: "Incubator funding",
  COMPETITION: "Competition",
  CHALLENGE: "Challenge",
  SUBSIDY: "Subsidy",
  FELLOWSHIP: "Fellowship",
  LOAN: "Loan",
  DEBT: "Debt",
  PRIZE: "Competition prize",
  INNOVATION_VOUCHER: "Innovation voucher",
  RND_FUNDING: "R&D funding",
  STIPEND: "Stipend",
  INVESTMENT: "Investment",
};

export const GEOGRAPHY_SCOPE_LABEL: Record<GeographyScope, string> = {
  PAN_INDIA: "Pan India",
  STATE: "State specific",
  CITY: "City specific",
  INTERNATIONAL: "International",
  REMOTE: "Remote / anywhere",
};

export const PROVIDER_SECTOR_LABEL: Record<ProviderSector, string> = {
  GOVERNMENT: "Government",
  PRIVATE: "Private",
  ACADEMIC: "Academic",
  NONPROFIT: "Non-profit",
  MULTILATERAL: "International organisation",
};

export const BENEFIT_FIELDS = [
  { name: "offersMentoring", label: "Mentoring" },
  { name: "offersIncubation", label: "Incubation" },
  { name: "offersNetworking", label: "Networking" },
  { name: "offersInvestorAccess", label: "Investor access" },
  { name: "offersLabAccess", label: "Lab access" },
  { name: "offersPilotOpportunities", label: "Pilot opportunities" },
  { name: "offersCorporatePartnerships", label: "Corporate partnerships" },
  { name: "offersMarketAccess", label: "Market access" },
] as const;
