import type {
  FundingType,
  GeographyScope,
  ProviderSector,
} from "@prisma/client";

export const SORTS = [
  "relevance",
  "newest",
  "closing",
  "largest",
  "updated",
  "popular",
] as const;

export type SortKey = (typeof SORTS)[number];

export const SORT_LABEL: Record<SortKey, string> = {
  relevance: "Best match",
  newest: "Newest",
  closing: "Closing soon",
  largest: "Largest funding",
  updated: "Recently updated",
  popular: "Most viewed",
};

export type OpportunityFilters = {
  q?: string;
  /** Category slugs from any dimension. OR within a dimension, AND across them. */
  categorySlugs?: string[];
  fundingTypes?: FundingType[];
  fundingAtLeast?: number;
  fundingAtMost?: number;
  currency?: string;
  state?: string;
  country?: string;
  geographyScopes?: GeographyScope[];
  providerSectors?: ProviderSector[];
  equityFreeOnly?: boolean;
  /** Programmes that demand DPIIT or Udyam registration. */
  registrationRequired?: boolean;
  closingWithinDays?: number;
  includeClosed?: boolean;
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

export type SearchHit = {
  id: string;
  slug: string;
  title: string;
  providerName: string;
  providerLogoUrl: string | null;
  shortDescription: string;
  fundingMin: string | null;
  fundingMax: string | null;
  currency: string;
  fundingAmountText: string | null;
  isEquityFree: boolean | null;
  fundingTypes: FundingType[];
  applicationDeadline: Date | null;
  isRollingDeadline: boolean;
  applicationOpenDate: Date | null;
  lifecycleOverride: string | null;
  geographyScope: GeographyScope;
  country: string | null;
  state: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  viewCount: number;
  categories: { name: string; slug: string; categoryType: string; isPrimary: boolean }[];
};

export type SearchResult = {
  hits: SearchHit[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
};

export interface SearchProvider {
  search(filters: OpportunityFilters): Promise<SearchResult>;
  /** Opportunity counts per category slug, honouring the other active filters. */
  facets(
    filters: OpportunityFilters,
    categorySlugs: string[],
  ): Promise<Map<string, number>>;
}
