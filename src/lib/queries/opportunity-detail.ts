import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { publiclyVisible } from "@/lib/visibility";
import { PUBLIC_CACHE_SECONDS, PUBLIC_CATALOG_TAG } from "@/lib/cache-tags";
import { search, type SearchHit } from "@/lib/search";

/** Cached per request — metadata and the page body both need the record. */
const getCachedPublishedOpportunity = unstable_cache(async (slug: string) => {
  return prisma.opportunity.findFirst({
    where: { slug, ...publiclyVisible },
    include: {
      categories: {
        include: {
          category: {
            select: { name: true, slug: true, categoryType: true, description: true },
          },
        },
        orderBy: [{ isPrimary: "desc" }],
      },
    },
  });
}, ["published-opportunity-v1"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: [PUBLIC_CATALOG_TAG],
});

type CachedPublishedOpportunity = Awaited<
  ReturnType<typeof getCachedPublishedOpportunity>
>;

const OPPORTUNITY_DATE_FIELDS = [
  "applicationDeadline",
  "applicationOpenDate",
  "programmeStartDate",
  "programmeEndDate",
  "lastVerifiedAt",
  "extractionDate",
  "lastCheckedAt",
  "contentLastUpdatedAt",
  "approvedAt",
  "publishedAt",
  "createdAt",
  "updatedAt",
] as const;

/** `unstable_cache` returns ISO strings for Prisma dates on a cache hit. */
function rehydratePublishedOpportunity(
  opportunity: CachedPublishedOpportunity,
): CachedPublishedOpportunity {
  if (!opportunity) return null;

  const dates = Object.fromEntries(
    OPPORTUNITY_DATE_FIELDS.map((field) => {
      const value = opportunity[field] as Date | string | null;
      return [field, value && !(value instanceof Date) ? new Date(value) : value];
    }),
  );

  return {
    ...opportunity,
    ...dates,
    categories: opportunity.categories.map((link) => ({
      ...link,
      createdAt:
        link.createdAt instanceof Date
          ? link.createdAt
          : new Date(link.createdAt as unknown as string),
    })),
  } as CachedPublishedOpportunity;
}

export const getPublishedOpportunity = cache(async (slug: string) =>
  rehydratePublishedOpportunity(await getCachedPublishedOpportunity(slug)),
);

export type PublishedOpportunity = NonNullable<
  Awaited<ReturnType<typeof getPublishedOpportunity>>
>;

/** Programmes sharing a category, nearest dimension first. */
export async function similarOpportunities(
  opportunity: PublishedOpportunity,
  limit = 3,
): Promise<SearchHit[]> {
  const primary =
    opportunity.categories.find((c) => c.isPrimary)?.category.slug ??
    opportunity.categories.find((c) => c.category.categoryType === "OPPORTUNITY_TYPE")
      ?.category.slug;
  const industry = opportunity.categories.find(
    (c) => c.category.categoryType === "INDUSTRY",
  )?.category.slug;

  const attempts = [
    [primary, industry].filter(Boolean) as string[],
    [industry].filter(Boolean) as string[],
    [primary].filter(Boolean) as string[],
    [],
  ];

  for (const categorySlugs of attempts) {
    const result = await search.search({
      categorySlugs,
      perPage: limit + 1,
      sort: "closing",
    });
    const hits = result.hits.filter((h) => h.id !== opportunity.id).slice(0, limit);
    if (hits.length >= Math.min(limit, 2)) return hits;
    if (categorySlugs.length === 0) return hits;
  }

  return [];
}
