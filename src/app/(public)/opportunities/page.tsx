import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { search } from "@/lib/search";
import { parseFilters, activeFilterCount, buildQuery, type RawParams } from "@/lib/search/params";
import { filterCategories, statesWithOpportunities } from "@/lib/queries/public";
import { FilterPanel } from "@/components/public/filter-panel";
import { OpportunityGrid } from "@/components/public/opportunity-card";
import { SearchBar } from "@/components/public/search-bar";
import { SortSelect } from "@/components/public/sort-select";
import { Pagination } from "@/components/public/pagination";

export const metadata: Metadata = {
  title: "Browse startup funding opportunities",
  description:
    "Search and filter grants, incubation programmes, accelerators, CSR funding and competitions for startups. Every opportunity links to its official source.",
  alternates: { canonical: "/opportunities" },
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

  const [categories, states] = await Promise.all([
    filterCategories(),
    statesWithOpportunities(),
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
    : "Startup funding opportunities";

  return (
    <>
      <div className="border-b border-line">
        <div className="page-shell py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-1.5 text-[12.5px] text-muted">
              <li>
                <Link href="/" className="hover:text-ink">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-ink">Browse</li>
            </ol>
          </nav>

          <h1 className="display-md max-w-[20ch]">{heading}</h1>
          <p className="lede mt-3 max-w-[58ch]">
            {results.total.toLocaleString("en-IN")} published{" "}
            {results.total === 1 ? "opportunity" : "opportunities"}, each linking
            to the provider&apos;s own page.
          </p>

          <div className="mt-7 max-w-[680px]">
            <SearchBar action={BASE} params={params} defaultValue={filters.q} />
          </div>
        </div>
      </div>

      <div className="page-shell py-8 lg:py-10">
        <div className="grid gap-9 lg:grid-cols-[248px_1fr]">
          <aside className="lg:sticky lg:top-[92px] lg:h-fit lg:max-h-[calc(100dvh-116px)] lg:overflow-y-auto lg:pr-1">
            <details open className="lg:open">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-[8px] border border-line px-3.5 py-2.5 lg:hidden">
                <span className="flex items-center gap-2 text-[14px] font-medium">
                  <SlidersHorizontal className="size-4" strokeWidth={1.7} />
                  Filters
                </span>
                {activeCount > 0 ? (
                  <span className="pill pill-dark">{activeCount}</span>
                ) : null}
              </summary>

              <div className="mt-4 lg:mt-0">
                <div className="mb-4 hidden items-center justify-between lg:flex">
                  <h2 className="text-[14px] font-medium">Filters</h2>
                  {activeCount > 0 ? (
                    <Link
                      href={`${BASE}${buildQuery({ q: params.q }, {})}`}
                      className="text-[12.5px] text-muted underline underline-offset-2 hover:text-ink"
                    >
                      Clear all
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
              </div>
            </details>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
              <EmptyState hasFilters={activeCount > 0 || Boolean(filters.q)} />
            ) : (
              <OpportunityGrid hits={results.hits} />
            )}

            <Pagination
              basePath={BASE}
              params={params}
              page={results.page}
              pages={results.pages}
              total={results.total}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-[12px] border border-dashed border-line-strong px-6 py-16 text-center">
      <p className="text-[17px] font-medium tracking-[-0.02em]">
        {hasFilters ? "Nothing matches that combination" : "No opportunities published yet"}
      </p>
      <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-muted">
        {hasFilters
          ? "Try removing a filter, or widening the funding range or deadline window."
          : "Published opportunities will appear here as soon as they clear review."}
      </p>
      {hasFilters ? (
        <Link href="/opportunities" className="btn btn-secondary mt-6">
          Clear all filters
        </Link>
      ) : null}
    </div>
  );
}
