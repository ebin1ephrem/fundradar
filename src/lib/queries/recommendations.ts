import "server-only";
import { prisma } from "@/lib/prisma";
import { search, type SearchHit } from "@/lib/search";

/**
 * Recommendations come from what a founder has actually looked at and saved,
 * plus whatever they have told us about their startup. No interests recorded
 * yet means the newest opportunities, which is honest rather than empty.
 */
export async function recommendedFor(
  leadId: string,
  limit = 6,
): Promise<{ hits: SearchHit[]; basis: string[] }> {
  const [interests, lead, saved] = await Promise.all([
    prisma.leadCategoryInterest.findMany({
      where: { leadId },
      orderBy: { weight: "desc" },
      take: 6,
      include: { category: { select: { slug: true, name: true, categoryType: true } } },
    }),
    prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        state: true,
        industryCategory: { select: { slug: true, name: true } },
        stageCategory: { select: { slug: true, name: true } },
      },
    }),
    prisma.savedOpportunity.findMany({
      where: { leadId },
      select: { opportunityId: true },
    }),
  ]);

  const savedIds = new Set(saved.map((s) => s.opportunityId));
  const slugs = new Set<string>();
  const basis: string[] = [];

  for (const item of interests) {
    slugs.add(item.category.slug);
    basis.push(item.category.name);
  }
  if (lead?.industryCategory) {
    slugs.add(lead.industryCategory.slug);
    basis.push(lead.industryCategory.name);
  }
  if (lead?.stageCategory) {
    slugs.add(lead.stageCategory.slug);
    basis.push(lead.stageCategory.name);
  }

  // Interests span dimensions, and requiring every dimension at once would
  // usually return nothing. Each is queried on its own and the results merged,
  // strongest interest first.
  const seen = new Set<string>();
  const hits: SearchHit[] = [];

  for (const slug of slugs) {
    if (hits.length >= limit) break;
    const result = await search.search({
      categorySlugs: [slug],
      sort: "closing",
      perPage: limit,
    });
    for (const hit of result.hits) {
      if (hits.length >= limit) break;
      if (seen.has(hit.id) || savedIds.has(hit.id)) continue;
      seen.add(hit.id);
      hits.push(hit);
    }
  }

  if (hits.length < limit) {
    const fallback = await search.search({ sort: "newest", perPage: limit * 2 });
    for (const hit of fallback.hits) {
      if (hits.length >= limit) break;
      if (seen.has(hit.id) || savedIds.has(hit.id)) continue;
      seen.add(hit.id);
      hits.push(hit);
    }
  }

  return { hits, basis: [...new Set(basis)].slice(0, 4) };
}
