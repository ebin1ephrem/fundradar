import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { search } from "@/lib/search";
import { OpportunityCard, OpportunityGrid } from "@/components/public/opportunity-card";
import { SearchBar } from "@/components/public/search-bar";
import { Icon } from "@/components/admin/icon";
import { CATEGORY_TYPE_LABEL } from "@/lib/validation/category";
import { CLOSING_SOON_DAYS } from "@/lib/opportunity-status";

export const dynamic = "force-dynamic";

const getCategory = cache(async (slug: string) =>
  prisma.category.findFirst({
    where: { slug, active: true },
    include: {
      parent: { select: { name: true, slug: true } },
      children: {
        where: { active: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: { name: true, slug: true },
      },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found" };

  const title = category.seoTitle ?? `${category.name} for startups`;
  const description =
    category.seoDescription ??
    category.description ??
    `Browse verified ${category.name.toLowerCase()} opportunities for startups, with deadlines and links to every official source.`;

  return {
    title,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: { title, description },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const base = { categorySlugs: [category.slug] };

  const [latest, closingSoon, featured, related, total] = await Promise.all([
    search.search({ ...base, sort: "newest", perPage: 6 }),
    search.search({ ...base, closingWithinDays: 30, sort: "closing", perPage: 3 }),
    search.search({ ...base, sort: "largest", perPage: 3 }),
    relatedCategories(category.id, category.categoryType, category.parentId),
    search.search({ ...base, perPage: 1 }),
  ]);

  const count = total.total;
  const industriesInside = await industriesFor(category.slug);

  return (
    <>
      <div className="border-b border-line">
        <div className="page-shell py-10 lg:py-16">
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
              <li>
                <Link href="/" className="hover:text-ink">Home</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/categories" className="hover:text-ink">Categories</Link>
              </li>
              {category.parent ? (
                <>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link href={`/categories/${category.parent.slug}`} className="hover:text-ink">
                      {category.parent.name}
                    </Link>
                  </li>
                </>
              ) : null}
              <li aria-hidden="true">/</li>
              <li className="text-ink">{category.name}</li>
            </ol>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-[10px] bg-ink text-accent">
                  <Icon name={category.icon} className="size-5" />
                </span>
                <span className="eyebrow">{CATEGORY_TYPE_LABEL[category.categoryType]}</span>
              </div>

              <h1 className="display-lg max-w-[16ch]">{category.name}</h1>
              {category.description ? (
                <p className="lede mt-4 max-w-[60ch]">{category.description}</p>
              ) : null}

              <p className="mt-5 text-[15px]">
                <span className="font-display text-[28px] leading-none font-medium tracking-[-0.03em] tabular-nums">
                  {count}
                </span>{" "}
                <span className="text-muted">
                  active {count === 1 ? "opportunity" : "opportunities"}
                </span>
              </p>
            </div>

            <div className="w-full max-w-[420px] lg:w-[420px]">
              <SearchBar
                action="/opportunities"
                params={{ c: category.slug }}
                placeholder={`Search within ${category.name}`}
              />
            </div>
          </div>

          {category.children.length ? (
            <div className="mt-8 border-t border-line pt-6">
              <p className="eyebrow mb-3">Inside {category.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {category.children.map((child) => (
                  <Link
                    key={child.slug}
                    href={`/categories/${child.slug}`}
                    className="pill transition-colors duration-200 hover:border-ink hover:text-ink"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="page-shell py-10 lg:py-14">
        {count === 0 ? (
          <div className="rounded-[12px] border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="text-[17px] font-medium tracking-[-0.02em]">
              Nothing published in {category.name} yet
            </p>
            <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-muted">
              This page fills in as opportunities in this category clear review.
            </p>
            <Link href="/opportunities" className="btn btn-secondary mt-6">
              Browse everything
            </Link>
          </div>
        ) : (
          <div className="grid gap-14">
            {closingSoon.hits.length ? (
              <Section
                title="Closing soon"
                description={`Deadlines inside the next ${CLOSING_SOON_DAYS * 4} days.`}
                href={`/opportunities?c=${category.slug}&closing=30`}
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {closingSoon.hits.map((hit) => (
                    <OpportunityCard key={hit.id} hit={hit} />
                  ))}
                </div>
              </Section>
            ) : null}

            <Section
              title="Latest opportunities"
              description={`Newly published in ${category.name}.`}
              href={`/opportunities?c=${category.slug}`}
            >
              <OpportunityGrid hits={latest.hits} />
            </Section>

            {featured.hits.length > 1 ? (
              <Section
                title="Largest funding"
                description="The biggest amounts on offer in this category."
                href={`/opportunities?c=${category.slug}&sort=largest`}
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {featured.hits.map((hit) => (
                    <OpportunityCard key={hit.id} hit={hit} />
                  ))}
                </div>
              </Section>
            ) : null}
          </div>
        )}

        {industriesInside.length ? (
          <section className="mt-14 border-t border-line pt-10">
            <h2 className="display-md">Industries in this category</h2>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {industriesInside.map((industry) => (
                <Link
                  key={industry.slug}
                  href={`/opportunities?c=${category.slug}&c=${industry.slug}`}
                  className="pill transition-colors duration-200 hover:border-ink hover:text-ink"
                >
                  {industry.name}
                  <span className="text-faint">{industry.count}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {related.length ? (
          <section className="mt-14 border-t border-line pt-10">
            <h2 className="display-md">Related categories</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/categories/${item.slug}`}
                  className="group rounded-[10px] border border-line p-4 transition-[border-color,transform] duration-200 hover:-translate-y-[2px] hover:border-line-strong"
                >
                  <span className="grid size-8 place-items-center rounded-[7px] bg-subtle">
                    <Icon name={item.icon} className="size-4" />
                  </span>
                  <p className="mt-3 text-[14.5px] font-medium tracking-[-0.015em]">
                    {item.name}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

function Section({
  title,
  description,
  href,
  children,
}: {
  title: string;
  description: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display-md">{title}</h2>
          <p className="mt-1.5 text-[14px] text-muted">{description}</p>
        </div>
        <Link href={href} className="text-[14px] text-muted underline underline-offset-2 hover:text-ink">
          View all
        </Link>
      </div>
      {children}
    </section>
  );
}

async function relatedCategories(
  id: string,
  categoryType: string,
  parentId: string | null,
) {
  return prisma.category.findMany({
    where: {
      active: true,
      id: { not: id },
      OR: [{ parentId }, { categoryType: categoryType as never, parentId: null }],
    },
    orderBy: [{ featured: "desc" }, { displayOrder: "asc" }],
    take: 8,
    select: { name: true, slug: true, icon: true },
  });
}

/** Which industries actually appear alongside this category, with counts. */
async function industriesFor(slug: string) {
  const industries = await prisma.category.findMany({
    where: { active: true, categoryType: "INDUSTRY" },
    select: { name: true, slug: true },
  });
  if (industries.length === 0) return [];

  const counts = await search.facets(
    { categorySlugs: [slug] },
    industries.map((i) => i.slug),
  );

  return industries
    .map((i) => ({ ...i, count: counts.get(i.slug) ?? 0 }))
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}
