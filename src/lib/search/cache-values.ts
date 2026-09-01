import type { Prisma } from "@prisma/client";
import type { SearchHit } from "./types";

type SearchCategories = SearchHit["categories"];

/** Raw values returned by the public search SQL before they enter Next's cache. */
export type SearchDatabaseRow = Omit<
  SearchHit,
  | "categories"
  | "fundingMin"
  | "fundingMax"
  | "applicationDeadline"
  | "applicationOpenDate"
  | "publishedAt"
  | "updatedAt"
  | "viewCount"
> & {
  fundingMin: Prisma.Decimal | null;
  fundingMax: Prisma.Decimal | null;
  applicationDeadline: Date | null;
  applicationOpenDate: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
  viewCount: number | bigint;
  search_rank: number;
  total_count: bigint;
};

/**
 * Converts a raw SQL row into the public cache DTO.
 *
 * Keep this mapping explicit: window/ranking columns can contain bigint values
 * and must never leak into a value serialised by `unstable_cache`.
 */
export function toCachedSearchHit(
  row: SearchDatabaseRow,
  categories: SearchCategories,
): SearchHit {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    providerName: row.providerName,
    providerLogoUrl: row.providerLogoUrl,
    shortDescription: row.shortDescription,
    fundingMin: row.fundingMin?.toString() ?? null,
    fundingMax: row.fundingMax?.toString() ?? null,
    currency: row.currency,
    fundingAmountText: row.fundingAmountText,
    isEquityFree: row.isEquityFree,
    fundingTypes: row.fundingTypes,
    applicationDeadline: row.applicationDeadline?.toISOString() ?? null,
    isRollingDeadline: row.isRollingDeadline,
    applicationOpenDate: row.applicationOpenDate?.toISOString() ?? null,
    lifecycleOverride: row.lifecycleOverride,
    geographyScope: row.geographyScope,
    country: row.country,
    state: row.state,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    viewCount: Number(row.viewCount),
    categories,
  };
}
