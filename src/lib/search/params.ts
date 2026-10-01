import {
  FundingType,
  GeographyScope,
  ProviderSector,
} from "@prisma/client";
import { SORTS, type OpportunityFilters, type SortKey } from "./types";

export type RawParams = Record<string, string | string[] | undefined>;

const ALLOWED_KEYS = [
  "q",
  "c",
  "type",
  "funding",
  "state",
  "scope",
  "provider",
  "equityFree",
  "registration",
  "closing",
  "closed",
  "sort",
  "page",
] as const;

const ALLOWED_KEY_SET = new Set<string>(ALLOWED_KEYS);
const MAX_VALUES = 6;
const MAX_VALUE_LENGTH = 80;
const MAX_QUERY_LENGTH = 120;
export const MAX_CATALOGUE_PAGE = 200;
const SINGLE_VALUE_KEYS = new Set<string>([
  "q",
  "funding",
  "state",
  "equityFree",
  "registration",
  "closing",
  "closed",
  "sort",
  "page",
]);

/** Preset ranges, so the URL stays readable and cacheable. */
export const FUNDING_BANDS = [
  { key: "under-10l", label: "Under ₹10 lakh", max: 1_000_000 },
  { key: "10l-50l", label: "₹10 – 50 lakh", min: 1_000_000, max: 5_000_000 },
  { key: "50l-1cr", label: "₹50 lakh – ₹1 crore", min: 5_000_000, max: 10_000_000 },
  { key: "1cr-5cr", label: "₹1 – 5 crore", min: 10_000_000, max: 50_000_000 },
  { key: "over-5cr", label: "Over ₹5 crore", min: 50_000_000 },
] as const;

export const DEADLINE_BANDS = [
  { key: "7", label: "Closing in 7 days" },
  { key: "30", label: "Closing in 30 days" },
  { key: "90", label: "Closing in 90 days" },
] as const;

function many(
  value: string | string[] | undefined,
  limit = MAX_VALUES,
  maxLength = MAX_VALUE_LENGTH,
): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return [...new Set(raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim().slice(0, maxLength))
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}

function one(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim().slice(0, MAX_VALUE_LENGTH) || undefined;
}

function enums<T extends Record<string, string>>(
  value: string | string[] | undefined,
  allowed: T,
): T[keyof T][] {
  const valid = new Set(Object.values(allowed));
  return many(value).filter((v) => valid.has(v)) as T[keyof T][];
}

export function parseFilters(params: RawParams): OpportunityFilters {
  const band = FUNDING_BANDS.find((b) => b.key === one(params.funding));
  const closing = one(params.closing);
  const sort = one(params.sort);

  return {
    q: (Array.isArray(params.q) ? params.q[0] : params.q)
      ?.trim()
      .slice(0, MAX_QUERY_LENGTH) || undefined,
    categorySlugs: many(params.c),
    fundingTypes: enums(params.type, FundingType),
    fundingAtLeast: band && "min" in band ? band.min : undefined,
    fundingAtMost: band && "max" in band ? band.max : undefined,
    state: one(params.state),
    geographyScopes: enums(params.scope, GeographyScope),
    providerSectors: enums(params.provider, ProviderSector),
    equityFreeOnly: one(params.equityFree) === "1",
    registrationRequired: one(params.registration) === "1",
    closingWithinDays:
      closing && DEADLINE_BANDS.some((b) => b.key === closing)
        ? Number(closing)
        : undefined,
    includeClosed: one(params.closed) === "1",
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : undefined,
    page: Math.min(
      MAX_CATALOGUE_PAGE,
      Math.max(1, Math.floor(Number(one(params.page) ?? 1)) || 1),
    ),
  };
}

/**
 * Drops unknown keys and canonicalises repeatable values before they reach
 * links, forms or cache keys. This prevents crawlers from manufacturing an
 * unbounded cache space with duplicate, reordered or irrelevant parameters.
 */
export function normalizeParams(params: RawParams): RawParams {
  const normalized: RawParams = {};
  for (const key of ALLOWED_KEYS) {
    if (SINGLE_VALUE_KEYS.has(key)) {
      const raw = Array.isArray(params[key]) ? params[key]?.[0] : params[key];
      const value = raw
        ?.trim()
        .slice(0, key === "q" ? MAX_QUERY_LENGTH : MAX_VALUE_LENGTH);
      if (value) normalized[key] = value;
      continue;
    }
    const values = many(
      params[key],
      MAX_VALUES,
      MAX_VALUE_LENGTH,
    );
    if (values.length) normalized[key] = values.length === 1 ? values[0] : values;
  }

  const page = parseFilters(normalized).page ?? 1;
  if (normalized.page) normalized.page = String(page);
  return normalized;
}

/** Rebuilds a query string with one thing changed. Empty values drop out. */
export function buildQuery(
  params: RawParams,
  changes: Record<string, string | string[] | undefined | null>,
): string {
  const sp = new URLSearchParams();

  const merged: RawParams = normalizeParams(params);
  for (const [key, value] of Object.entries(changes)) {
    if (!ALLOWED_KEY_SET.has(key)) continue;
    if (value === null || value === undefined || value === "") delete merged[key];
    else merged[key] = value;
  }
  // Any change to the result set puts you back on page one.
  if (!("page" in changes)) delete merged.page;

  for (const key of ALLOWED_KEYS) {
    const value = merged[key];
    const items = SINGLE_VALUE_KEYS.has(key)
      ? [
          (Array.isArray(value) ? value[0] : value)
            ?.trim()
            .slice(0, key === "q" ? MAX_QUERY_LENGTH : MAX_VALUE_LENGTH),
        ].filter((item): item is string => Boolean(item))
      : many(value);
    for (const item of items) sp.append(key, item);
  }

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/** Adds or removes one value from a repeatable parameter. */
export function toggleValue(
  params: RawParams,
  key: string,
  value: string,
): Record<string, string[] | undefined> {
  const current = many(params[key]);
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return { [key]: next.length ? next : undefined };
}

export function isSelected(
  params: RawParams,
  key: string,
  value: string,
): boolean {
  return many(params[key]).includes(value);
}

export function activeFilterCount(params: RawParams): number {
  const keys = [
    "c",
    "type",
    "funding",
    "state",
    "scope",
    "provider",
    "equityFree",
    "registration",
    "closing",
    "closed",
  ];
  return keys.reduce((sum, key) => sum + (many(params[key]).length ? 1 : 0), 0);
}
