import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { publiclyVisible } from "@/lib/visibility";
import { PUBLIC_CACHE_SECONDS, PUBLIC_CATALOG_TAG } from "@/lib/cache-tags";
import type { FilterCategory } from "@/components/public/filter-panel";

/** Top-level categories used to build the filter sidebar. */
const getFilterCategories = unstable_cache(async (): Promise<FilterCategory[]> => {
  return prisma.category.findMany({
    where: {
      active: true,
      parentId: null,
      categoryType: {
        in: ["OPPORTUNITY_TYPE", "INDUSTRY", "STARTUP_STAGE", "FOUNDER_TYPE"],
      },
      NOT: { slug: { contains: "subsid", mode: "insensitive" } },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { name: true, slug: true, categoryType: true, featured: true },
  });
}, ["public-filter-categories-v1"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: [PUBLIC_CATALOG_TAG],
});

export async function filterCategories(): Promise<FilterCategory[]> {
  return getFilterCategories();
}

/** Only states that actually have published opportunities. */
const getStatesWithOpportunities = unstable_cache(async (): Promise<string[]> => {
  const rows = await prisma.opportunity.findMany({
    where: { ...publiclyVisible, state: { not: null } },
    distinct: ["state"],
    select: { state: true },
    orderBy: { state: "asc" },
  });
  return rows.map((r) => r.state!).filter(Boolean);
}, ["public-opportunity-states-v1"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: [PUBLIC_CATALOG_TAG],
});

export async function statesWithOpportunities(): Promise<string[]> {
  return getStatesWithOpportunities();
}

const getHomepageCategories = unstable_cache(async () => {
  return prisma.category.findMany({
    where: {
      active: true,
      showOnHomepage: true,
      NOT: { slug: { contains: "subsid", mode: "insensitive" } },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, description: true, icon: true },
  });
}, ["public-homepage-categories-v1"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: [PUBLIC_CATALOG_TAG],
});

export async function homepageCategories() {
  return getHomepageCategories();
}

const getPublicProviderCount = unstable_cache(async () => {
  const rows = await prisma.opportunity.findMany({
    where: publiclyVisible,
    distinct: ["providerName"],
    select: { providerName: true },
  });
  return rows.length;
}, ["public-provider-count-v1"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: [PUBLIC_CATALOG_TAG],
});

export async function publicProviderCount(): Promise<number> {
  return getPublicProviderCount();
}
