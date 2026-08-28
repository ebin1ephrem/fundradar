import "server-only";
import { Prisma, type GeographyScope, type ProviderSector } from "@prisma/client";
import type { ExtractionField, ExtractionOutcome } from "@/lib/ai";

const GEOGRAPHY_SCOPES = ["PAN_INDIA", "STATE", "CITY", "INTERNATIONAL", "REMOTE"];
const PROVIDER_SECTORS = ["GOVERNMENT", "PRIVATE", "ACADEMIC", "NONPROFIT", "MULTILATERAL"];

const TEXT_LIMITS: Partial<Record<ExtractionField, number>> = {
  title: 220,
  providerName: 180,
  programmeName: 200,
  shortDescription: 400,
  currency: 3,
};

type Draft = Record<string, unknown>;

/**
 * Turns extracted strings into the column types the canonical schema expects.
 * A value that cannot be parsed is dropped rather than coerced — a deadline
 * that failed to parse must not become a wrong date.
 */
export function normaliseExtraction(outcome: ExtractionOutcome): {
  draft: Draft;
  rejected: { field: string; value: string; reason: string }[];
} {
  const draft: Draft = {};
  const rejected: { field: string; value: string; reason: string }[] = [];

  for (const field of outcome.fields) {
    const raw = field.value?.trim();
    if (!raw || /^(unknown|not specified|n\/?a|none|null)$/i.test(raw)) continue;

    switch (field.name) {
      case "fundingMin":
      case "fundingMax": {
        const amount = Number(raw.replace(/[^\d.]/g, ""));
        if (!Number.isFinite(amount) || amount <= 0) {
          rejected.push({ field: field.name, value: raw, reason: "not a positive number" });
          break;
        }
        draft[field.name] = new Prisma.Decimal(Math.round(amount));
        break;
      }

      case "incorporationAgeMinMonths":
      case "incorporationAgeMaxMonths": {
        const months = Number(raw.replace(/[^\d]/g, ""));
        if (!Number.isInteger(months) || months < 0) {
          rejected.push({ field: field.name, value: raw, reason: "not a whole number of months" });
          break;
        }
        draft[field.name] = months;
        break;
      }

      case "applicationDeadline":
      case "applicationOpenDate":
      case "programmeStartDate":
      case "programmeEndDate": {
        const date = parseDate(raw);
        if (!date) {
          rejected.push({ field: field.name, value: raw, reason: "not a complete date" });
          break;
        }
        draft[field.name] = date;
        break;
      }

      case "isEquityFree":
      case "isRollingDeadline":
      case "requiresDpiit":
      case "requiresMsmeUdyam":
      case "requiresStudentFounder":
      case "requiresWomenFounder":
      case "offersMentoring":
      case "offersIncubation":
      case "offersNetworking":
      case "offersInvestorAccess":
      case "offersLabAccess":
      case "offersPilotOpportunities":
      case "offersCorporatePartnerships":
      case "offersMarketAccess": {
        const bool = parseBoolean(raw);
        if (bool === null) {
          rejected.push({ field: field.name, value: raw, reason: "not yes or no" });
          break;
        }
        draft[field.name] = bool;
        break;
      }

      case "companyTypes":
      case "technologies": {
        const list = raw
          .split(/[,;|]/)
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, 20);
        if (list.length) draft[field.name] = list;
        break;
      }

      case "geographyScope": {
        const value = raw.toUpperCase().replace(/[\s-]/g, "_");
        if (!GEOGRAPHY_SCOPES.includes(value)) {
          rejected.push({ field: field.name, value: raw, reason: "not a known scope" });
          break;
        }
        draft.geographyScope = value as GeographyScope;
        break;
      }

      case "providerSector": {
        const value = raw.toUpperCase().replace(/[\s-]/g, "_");
        if (!PROVIDER_SECTORS.includes(value)) {
          rejected.push({ field: field.name, value: raw, reason: "not a known provider type" });
          break;
        }
        draft.providerSector = value as ProviderSector;
        break;
      }

      case "applicationUrl":
      case "officialSourceUrl": {
        const url = normaliseUrl(raw);
        if (!url) {
          rejected.push({ field: field.name, value: raw, reason: "not a usable URL" });
          break;
        }
        draft[field.name] = url;
        break;
      }

      case "contactEmail": {
        const email = raw.toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          rejected.push({ field: field.name, value: raw, reason: "not an email address" });
          break;
        }
        draft.contactEmail = email;
        break;
      }

      // Not columns on Opportunity — kept on the extraction run so an admin can
      // still see them in the review screen.
      case "equityPercentage":
      case "contactPhone":
        break;

      default: {
        const limit = TEXT_LIMITS[field.name];
        draft[field.name] = limit ? raw.slice(0, limit) : raw;
      }
    }
  }

  if (draft.currency) {
    const code = String(draft.currency).toUpperCase();
    if (/^[A-Z]{3}$/.test(code)) draft.currency = code;
    else delete draft.currency;
  }

  // A minimum above the maximum means one of them was read wrong. Keep the
  // ceiling, which is the number founders act on, and flag the other.
  const min = draft.fundingMin as Prisma.Decimal | undefined;
  const max = draft.fundingMax as Prisma.Decimal | undefined;
  if (min && max && min.greaterThan(max)) {
    rejected.push({
      field: "fundingMin",
      value: min.toString(),
      reason: "was larger than the maximum",
    });
    delete draft.fundingMin;
  }

  return { draft, rejected };
}

function parseDate(raw: string): Date | null {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(`${iso[0]}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function parseBoolean(raw: string): boolean | null {
  if (/^(true|yes|y|required|1)$/i.test(raw)) return true;
  if (/^(false|no|n|not required|0)$/i.test(raw)) return false;
  return null;
}

export function normaliseUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/[.,;)\]]+$/, "");
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Strips tracking parameters and fragments so the same page hashes the same. */
export function canonicaliseUrl(raw: string): string | null {
  const normalised = normaliseUrl(raw);
  if (!normalised) return null;
  try {
    const url = new URL(normalised);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_cid|mc_eid|ref)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return null;
  }
}
