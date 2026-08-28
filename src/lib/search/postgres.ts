import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_WORKFLOW_STATUSES } from "@/lib/visibility";
import { parseQuery, type ParsedQuery } from "./query";
import type {
  OpportunityFilters,
  SearchHit,
  SearchProvider,
  SearchResult,
} from "./types";

const DEFAULT_PER_PAGE = 24;
const MAX_PER_PAGE = 60;

/**
 * Postgres full-text search.
 *
 * Ranking combines the weighted `searchVector` generated column with a trigram
 * similarity score on the title, so "biotec" still finds "BioTech" and an exact
 * title match still outranks a body-text mention.
 *
 * The whole query is one round trip rather than "find ids, then hydrate", so
 * relevance ordering and pagination stay consistent.
 */
export class PostgresSearchProvider implements SearchProvider {
  async search(filters: OpportunityFilters): Promise<SearchResult> {
    const page = Math.max(1, filters.page ?? 1);
    const perPage = Math.min(MAX_PER_PAGE, Math.max(1, filters.perPage ?? DEFAULT_PER_PAGE));
    const where = await buildWhere(filters);
    const parsed = parseQuery(filters.q);
    const rank = rankExpression(parsed);

    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        o.id, o.slug, o.title, o."providerName", o."providerLogoUrl",
        o."shortDescription", o."fundingMin", o."fundingMax", o.currency,
        o."fundingAmountText", o."isEquityFree", o."fundingTypes",
        o."applicationDeadline", o."isRollingDeadline", o."applicationOpenDate",
        o."lifecycleOverride", o."geographyScope", o.country, o.state,
        o."publishedAt", o."updatedAt", o."viewCount",
        ${rank} AS search_rank,
        COUNT(*) OVER () AS total_count
      FROM "Opportunity" o
      WHERE ${where}
      ORDER BY ${orderBy(filters, parsed)}
      LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
    `;

    const total = rows.length ? Number(rows[0].total_count) : 0;
    const hits = await attachCategories(rows);

    return {
      hits,
      total,
      page,
      perPage,
      pages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async facets(
    filters: OpportunityFilters,
    categorySlugs: string[],
  ): Promise<Map<string, number>> {
    if (categorySlugs.length === 0) return new Map();
    const where = await buildWhere(filters);

    // Counts roll descendants up into their parent, so "Grants" reflects
    // everything filed under Prototype Grants, R&D Grants and the rest.
    const rows = await prisma.$queryRaw<{ slug: string; count: bigint }[]>`
      WITH RECURSIVE tree AS (
        SELECT id AS root_id, id, slug AS root_slug
        FROM "Category"
        WHERE slug IN (${Prisma.join(categorySlugs)})
        UNION ALL
        SELECT t.root_id, c.id, t.root_slug
        FROM "Category" c
        JOIN tree t ON c."parentId" = t.id
      ),
      matching AS (
        SELECT o.id FROM "Opportunity" o WHERE ${where}
      )
      SELECT t.root_slug AS slug, COUNT(DISTINCT oc."opportunityId") AS count
      FROM tree t
      JOIN "OpportunityCategory" oc ON oc."categoryId" = t.id
      JOIN matching m ON m.id = oc."opportunityId"
      GROUP BY t.root_slug
    `;

    return new Map(rows.map((r) => [r.slug, Number(r.count)]));
  }
}

type RawRow = Omit<SearchHit, "categories" | "fundingMin" | "fundingMax"> & {
  fundingMin: Prisma.Decimal | null;
  fundingMax: Prisma.Decimal | null;
  search_rank: number;
  total_count: bigint;
};

async function buildWhere(filters: OpportunityFilters): Promise<Prisma.Sql> {
  const clauses: Prisma.Sql[] = [
    Prisma.sql`o."workflowStatus" = ANY(ARRAY[${Prisma.join(
      PUBLIC_WORKFLOW_STATUSES,
    )}]::"WorkflowStatus"[])`,
    Prisma.sql`o."isActive" = true`,
  ];

  const parsed = parseQuery(filters.q);
  if (parsed) {
    // Indexed tsquery match first so the GIN index does the heavy lifting, then
    // the minimum-match count on the surviving candidates. The trigram and
    // category clauses are escape hatches for typos and for words that only
    // appear in a record's tags.
    clauses.push(Prisma.sql`(
      (
        o."searchVector" @@ to_tsquery('english', ${parsed.orQuery})
        AND ${matchCount(parsed)} >= ${parsed.minMatch}
      )
      OR ${parsed.phrase} <% o."title"
      OR ${parsed.phrase} <% o."providerName"
      OR ${categoryMatch(parsed)}
    )`);
  }

  // Within a dimension the selections are alternatives; across dimensions they
  // narrow. Picking "Grants" and "ClimateTech" means both must hold.
  for (const group of await groupCategorySlugs(filters.categorySlugs)) {
    clauses.push(Prisma.sql`EXISTS (
      WITH RECURSIVE tree AS (
        SELECT id FROM "Category" WHERE id IN (${Prisma.join(group)})
        UNION ALL
        SELECT c.id FROM "Category" c JOIN tree t ON c."parentId" = t.id
      )
      SELECT 1 FROM "OpportunityCategory" oc
      JOIN tree ON tree.id = oc."categoryId"
      WHERE oc."opportunityId" = o.id
    )`);
  }

  if (filters.fundingTypes?.length) {
    clauses.push(
      Prisma.sql`o."fundingTypes" && ARRAY[${Prisma.join(
        filters.fundingTypes,
      )}]::"FundingType"[]`,
    );
  }

  if (filters.fundingAtLeast !== undefined) {
    clauses.push(
      Prisma.sql`COALESCE(o."fundingMax", o."fundingMin") >= ${filters.fundingAtLeast}`,
    );
  }
  if (filters.fundingAtMost !== undefined) {
    clauses.push(
      Prisma.sql`COALESCE(o."fundingMin", o."fundingMax") <= ${filters.fundingAtMost}`,
    );
  }
  if (filters.currency) {
    clauses.push(Prisma.sql`o.currency = ${filters.currency}`);
  }

  if (filters.state) {
    clauses.push(Prisma.sql`o.state ILIKE ${filters.state}`);
  }
  if (filters.country) {
    clauses.push(Prisma.sql`o.country ILIKE ${filters.country}`);
  }
  if (filters.geographyScopes?.length) {
    clauses.push(
      Prisma.sql`o."geographyScope" = ANY(ARRAY[${Prisma.join(
        filters.geographyScopes,
      )}]::"GeographyScope"[])`,
    );
  }
  if (filters.providerSectors?.length) {
    clauses.push(
      Prisma.sql`o."providerSector" = ANY(ARRAY[${Prisma.join(
        filters.providerSectors,
      )}]::"ProviderSector"[])`,
    );
  }

  if (filters.equityFreeOnly) {
    clauses.push(Prisma.sql`o."isEquityFree" = true`);
  }
  if (filters.registrationRequired) {
    clauses.push(
      Prisma.sql`(o."requiresDpiit" = true OR o."requiresMsmeUdyam" = true)`,
    );
  }

  if (filters.closingWithinDays !== undefined) {
    clauses.push(Prisma.sql`
      o."isRollingDeadline" = false
      AND o."applicationDeadline" IS NOT NULL
      AND o."applicationDeadline" >= NOW()
      AND o."applicationDeadline" <= NOW() + (${filters.closingWithinDays} * INTERVAL '1 day')
    `);
  }

  // Closed programmes stay in the database and stay searchable, but they are
  // out of the default view because a founder cannot act on them.
  if (!filters.includeClosed) {
    clauses.push(Prisma.sql`(
      o."isRollingDeadline" = true
      OR o."applicationDeadline" IS NULL
      OR o."applicationDeadline" >= CURRENT_DATE
      OR o."lifecycleOverride" IN ('OPEN', 'ROLLING', 'CLOSING_SOON')
    )`);
  }

  return Prisma.join(clauses, " AND ");
}

/** Resolves slugs to ids, bucketed by the dimension they belong to. */
async function groupCategorySlugs(slugs?: string[]): Promise<string[][]> {
  if (!slugs?.length) return [];
  const rows = await prisma.category.findMany({
    where: { slug: { in: slugs }, active: true },
    select: { id: true, categoryType: true },
  });

  const byType = new Map<string, string[]>();
  for (const row of rows) {
    const list = byType.get(row.categoryType) ?? [];
    list.push(row.id);
    byType.set(row.categoryType, list);
  }
  return [...byType.values()];
}

/** How many of the query's terms this record actually contains. */
function matchCount(parsed: ParsedQuery): Prisma.Sql {
  return Prisma.join(
    parsed.prefixed.map(
      (term) =>
        Prisma.sql`(CASE WHEN o."searchVector" @@ to_tsquery('english', ${term}) THEN 1 ELSE 0 END)`,
    ),
    " + ",
  );
}

function categoryMatch(parsed: ParsedQuery): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "OpportunityCategory" oc
    JOIN "Category" c ON c.id = oc."categoryId"
    WHERE oc."opportunityId" = o.id
      AND c.name ILIKE ANY(ARRAY[${Prisma.join(parsed.patterns)}])
  )`;
}

/**
 * More matching terms beats fewer; a precise all-terms match beats a partial
 * one; a title hit beats a hit buried in the body; and a category hit still
 * counts, so "climate" finds records tagged ClimateTech even when the word
 * never appears in their text.
 */
function rankExpression(parsed: ParsedQuery | null): Prisma.Sql {
  if (!parsed) return Prisma.sql`0`;
  return Prisma.sql`(
    (${matchCount(parsed)})::float * 2
    + ts_rank(o."searchVector", to_tsquery('english', ${parsed.andQuery})) * 8
    + ts_rank(o."searchVector", to_tsquery('english', ${parsed.orQuery})) * 3
    + word_similarity(${parsed.phrase}, o."title") * 4
    + word_similarity(${parsed.phrase}, o."providerName") * 2
    + CASE WHEN ${categoryMatch(parsed)} THEN 1.5 ELSE 0 END
  )`;
}

function orderBy(
  filters: OpportunityFilters,
  parsed: ParsedQuery | null,
): Prisma.Sql {
  const sort = filters.sort ?? (parsed ? "relevance" : "newest");
  const newest = Prisma.sql`o."publishedAt" DESC NULLS LAST, o."createdAt" DESC`;

  switch (sort) {
    case "closing":
      // Rolling and undated programmes have no deadline to be closing against.
      return Prisma.sql`
        (o."isRollingDeadline" = true OR o."applicationDeadline" IS NULL) ASC,
        o."applicationDeadline" ASC NULLS LAST, ${newest}`;
    case "largest":
      return Prisma.sql`COALESCE(o."fundingMax", o."fundingMin") DESC NULLS LAST, ${newest}`;
    case "updated":
      return Prisma.sql`o."updatedAt" DESC`;
    case "popular":
      return Prisma.sql`o."viewCount" DESC, o."saveCount" DESC, ${newest}`;
    case "relevance":
      // Sorts on the alias so the rank expression is evaluated once per row,
      // not a second time for the sort.
      return parsed ? Prisma.sql`search_rank DESC, ${newest}` : newest;
    default:
      return newest;
  }
}

async function attachCategories(rows: RawRow[]): Promise<SearchHit[]> {
  if (rows.length === 0) return [];

  const links = await prisma.opportunityCategory.findMany({
    where: { opportunityId: { in: rows.map((r) => r.id) } },
    select: {
      opportunityId: true,
      isPrimary: true,
      category: { select: { name: true, slug: true, categoryType: true } },
    },
    orderBy: [{ isPrimary: "desc" }, { category: { displayOrder: "asc" } }],
  });

  const byOpportunity = new Map<string, SearchHit["categories"]>();
  for (const link of links) {
    const list = byOpportunity.get(link.opportunityId) ?? [];
    list.push({
      name: link.category.name,
      slug: link.category.slug,
      categoryType: link.category.categoryType,
      isPrimary: link.isPrimary,
    });
    byOpportunity.set(link.opportunityId, list);
  }

  return rows.map((row) => ({
    ...row,
    fundingMin: row.fundingMin?.toString() ?? null,
    fundingMax: row.fundingMax?.toString() ?? null,
    categories: byOpportunity.get(row.id) ?? [],
  }));
}
