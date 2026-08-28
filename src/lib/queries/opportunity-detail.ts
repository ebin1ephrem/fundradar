import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { search, type SearchHit } from "@/lib/search";

/** Cached per request — metadata and the page body both need the record. */
export const getPublishedOpportunity = cache(async (slug: string) => {
  return prisma.opportunity.findFirst({
    where: { slug, workflowStatus: "PUBLISHED", isActive: true },
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
});

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
