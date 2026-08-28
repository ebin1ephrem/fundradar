import "server-only";
import { prisma } from "@/lib/prisma";
import { publiclyVisible } from "@/lib/visibility";
import type { FilterCategory } from "@/components/public/filter-panel";

/** Top-level categories used to build the filter sidebar. */
export async function filterCategories(): Promise<FilterCategory[]> {
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
}

/** Only states that actually have published opportunities. */
export async function statesWithOpportunities(): Promise<string[]> {
  const rows = await prisma.opportunity.findMany({
    where: { ...publiclyVisible, state: { not: null } },
    distinct: ["state"],
    select: { state: true },
    orderBy: { state: "asc" },
  });
  return rows.map((r) => r.state!).filter(Boolean);
}

export async function homepageCategories() {
  return prisma.category.findMany({
    where: {
      active: true,
      showOnHomepage: true,
      NOT: { slug: { contains: "subsid", mode: "insensitive" } },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, description: true, icon: true },
  });
}
