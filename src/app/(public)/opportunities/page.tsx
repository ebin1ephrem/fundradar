import type { Metadata } from "next";
import Link from "next/link";
import { search } from "@/lib/search";
import { parseFilters, activeFilterCount, buildQuery, type RawParams } from "@/lib/search/params";
import { filterCategories, statesWithOpportunities } from "@/lib/queries/public";
import { FilterPanel } from "@/components/public/filter-panel";
import { OpportunityGrid } from "@/components/public/opportunity-card";
import { SearchBar } from "@/components/public/search-bar";
import { SortSelect } from "@/components/public/sort-select";
import { Pagination } from "@/components/public/pagination";
import { LeadGateSubject } from "@/components/lead/gate-context";
import { savedOpportunityIds } from "@/lib/leads/identity";
import { brand, search as searchCopy, seo } from "@/content/copy";
import { Reveal } from "@/components/public/motion/reveal";
import { MobileFilterDrawer } from "@/components/public/mobile-filter-drawer";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: seo.opportunities.title,
  description: seo.opportunities.description,
  alternates: { canonical: "/opportunities" },
  openGraph: {
    title: seo.opportunities.title,
    description: seo.opportunities.description,
    url: "/opportunities",
    siteName: brand.lockup,
    type: "website",
  },
};

export const dynamic = "force-dynamic";

const BASE = "/opportunities";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [categories, states, savedIds] = await Promise.all([
    filterCategories(),
    statesWithOpportunities(),
    savedOpportunityIds(),
  ]);

  const [results, counts] = await Promise.all([
    search.search(filters),
    search.facets(
      // Counts ignore the category filters themselves, so a founder can see how
      // many results each alternative would give rather than only the one
      // they already picked.
      { ...filters, categorySlugs: [] },
      categories.map((c) => c.slug),
    ),
  ]);

  const activeCount = activeFilterCount(params);
  const heading = filters.q
    ? `Results for “${filters.q}”`
    : "Open opportunities";
  const clearFiltersHref = `${BASE}${buildQuery(
    { q: params.q, sort: params.sort },
    {},
  )}`;
  const quickFilters = [
    {
      label: "Closing Soon",
      active: filters.closingWithinDays === 7,
      href: `${BASE}${buildQuery(params, {
        closing: filters.closingWithinDays === 7 ? undefined : "7",
      })}`,
    },
    {
      label: "Equity-free",
      active: filters.equityFreeOnly,
      href: `${BASE}${buildQuery(params, {
        equityFree: filters.equityFreeOnly ? undefined : "1",
      })}`,
    },
    {
      label: "New",
      active: params.sort === "newest",
      href: `${BASE}${buildQuery(params, {
        sort: params.sort === "newest" ? undefined : "newest",
      })}`,
    },
  ];

  return (
    <>
      <LeadGateSubject
        subject={{
          kind: filters.q ? "search" : "general",
          label: filters.q,
          count: results.total,
          categoryIds: categories
            .filter((c) => (filters.categorySlugs ?? []).includes(c.slug))
            .map((c) => c.slug),
        }}
      />

      <div className="border-b border-line">
        <Reveal className="page-shell py-7 lg:py-14">
          <nav aria-label="Breadcrumb" className="mb-3 lg:mb-4">
            <ol className="flex items-center gap-1.5 text-[12.5px] text-muted">
              <li>
                <Link href="/" className="hover:text-ink">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink">Open opportunities</li>
            </ol>
          </nav>

          <h1 className="display-md max-w-[20ch]">{heading}</h1>
          <p className="lede mt-3 max-w-[58ch]">
            {results.total.toLocaleString("en-IN")}{" "}
            {results.total === 1 ? "opportunity" : "opportunities"} open now,
            each linking to the provider&apos;s own page.
          </p>

          <div className="mt-5 max-w-[680px] lg:mt-7">
            <SearchBar action={BASE} params={params} defaultValue={filters.q} />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {quickFilters.map((quickFilter) => (
              <Link
                key={quickFilter.label}
                href={quickFilter.href}
                scroll={false}
                aria-pressed={quickFilter.active}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center rounded-[8px] border px-3.5 text-[13px] font-medium transition-colors duration-200",
                  quickFilter.active
                    ? "border-accent bg-accent text-ink"
                    : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {quickFilter.label}
              </Link>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="page-shell py-5 lg:py-10">
        <div className="mb-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <MobileFilterDrawer
              activeCount={activeCount}
              clearHref={clearFiltersHref}
            >
              <FilterPanel
                basePath={BASE}
                params={params}
                categories={categories}
                counts={counts}
                states={states}
                mode="drawer"
              />
            </MobileFilterDrawer>
            <SortSelect
              basePath={BASE}
              value={filters.sort ?? (filters.q ? "relevance" : "newest")}
              hasQuery={Boolean(filters.q)}
              compact
            />
          </div>
          <p className="mt-3 text-[13.5px] text-muted" aria-live="polite">
            {results.total.toLocaleString("en-IN")} {results.total === 1 ? "opportunity" : "opportunities"}
          </p>
        </div>

        <div className="grid gap-9 lg:grid-cols-[248px_1fr]">
          <Reveal as="aside" className="hidden lg:sticky lg:top-[92px] lg:block lg:h-fit lg:max-h-[calc(100dvh-116px)] lg:overflow-y-auto lg:pr-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-medium">Filters</h2>
              {activeCount > 0 ? (
                <Link
                  href={clearFiltersHref}
                  className="text-[12.5px] text-muted underline underline-offset-2 hover:text-ink"
                >
                  {searchCopy.filters.clear}
                </Link>
              ) : null}
            </div>

            <FilterPanel
              basePath={BASE}
              params={params}
              categories={categories}
              counts={counts}
              states={states}
            />
          </Reveal>

          <Reveal className="min-w-0" delay={90}>
            <div className="mb-5 hidden flex-wrap items-center justify-between gap-3 lg:flex">
              <p className="text-[13.5px] text-muted">
                Showing{" "}
                {results.total === 0
                  ? "0"
                  : `${(results.page - 1) * results.perPage + 1}–${Math.min(
                      results.page * results.perPage,
                      results.total,
                    )}`}{" "}
                of {results.total.toLocaleString("en-IN")}
              </p>
              <SortSelect
                basePath={BASE}
                value={filters.sort ?? (filters.q ? "relevance" : "newest")}
                hasQuery={Boolean(filters.q)}
              />
            </div>

            {results.hits.length === 0 ? (
              <EmptyState
                hasFilters={activeCount > 0 || Boolean(filters.q)}
                query={filters.q}
              />
            ) : (
              <OpportunityGrid hits={results.hits} savedIds={savedIds} />
            )}

            <Pagination
              basePath={BASE}
              params={params}
              page={results.page}
              pages={results.pages}
              total={results.total}
            />
          </Reveal>
        </div>
      </div>
    </>
  );
}

function EmptyState({
  hasFilters,
  query,
}: {
  hasFilters: boolean;
  query?: string;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-line-strong px-6 py-16 text-center">
      <p className="text-[17px] font-medium tracking-[-0.02em]">
        {query
          ? searchCopy.noResults.headline(query)
          : hasFilters
            ? "No signal for that combination — yet."
            : "Nothing on the Radar yet."}
      </p>
      <p className="mx-auto mt-2 max-w-[52ch] text-[14px] leading-relaxed text-muted">
        {hasFilters
          ? searchCopy.noResults.body
          : "New opportunities will appear here as they become available."}
      </p>
      {hasFilters ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/categories" className="btn btn-secondary">
            {searchCopy.noResults.browseCta}
          </Link>
          <Link href="/dashboard/alerts" className="btn btn-primary">
            {searchCopy.noResults.radarCta}
          </Link>
          <Link href="/opportunities" className="btn btn-secondary">
            {searchCopy.filters.clear}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
