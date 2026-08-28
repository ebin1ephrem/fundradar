import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck, Timer, Waypoints } from "lucide-react";
import { search } from "@/lib/search";
import { homepageCategories } from "@/lib/queries/public";
import { prisma } from "@/lib/prisma";
import { OpportunityCard } from "@/components/public/opportunity-card";
import { SearchBar } from "@/components/public/search-bar";
import { Icon } from "@/components/admin/icon";
import { CLOSING_SOON_DAYS } from "@/lib/opportunity-status";

export const metadata: Metadata = {
  title: "FundRadar — Find grants and funding for your startup",
  description:
    "Search verified startup grants, incubation programmes, accelerators, CSR funding and competitions. Every opportunity links to its official source.",
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, totals, closingSoon, recent, equityFree, largest] =
    await Promise.all([
      homepageCategories(),
      search.search({ perPage: 1 }),
      search.search({ closingWithinDays: 30, sort: "closing", perPage: 3 }),
      search.search({ sort: "newest", perPage: 3 }),
      search.search({ equityFreeOnly: true, perPage: 1 }),
      search.search({ sort: "largest", perPage: 1 }),
    ]);

  // Counts come from the database, never typed by hand.
  const categoryCounts = await search.facets(
    {},
    categories.map((c) => c.slug),
  );
  const providerCount = await prisma.opportunity
    .findMany({
      where: { workflowStatus: "PUBLISHED", isActive: true },
      distinct: ["providerName"],
      select: { providerName: true },
    })
    .then((rows) => rows.length);

  const total = totals.total;

  return (
    <>
      {/* Hero ------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="dot-grid pointer-events-none absolute inset-0 opacity-[0.55]"
          aria-hidden="true"
        />
        <div className="page-shell relative py-16 lg:py-28">
          <p className="eyebrow">
            {total.toLocaleString("en-IN")} verified opportunities
          </p>
          <h1 className="display-xl mt-4 max-w-[16ch]">
            Find grants and funding for your startup.
          </h1>

          <p className="lede mt-6 max-w-[54ch]">
            Grants, incubation programmes, accelerators, CSR funding and
            competitions — searchable in one place, with deadlines you can trust
            and a link to every official source.
          </p>

          <div className="mt-9 max-w-[720px]">
            <SearchBar size="lg" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-muted">
            <span>Try:</span>
            {[
              { label: "DeepTech grants", href: "/opportunities?q=deeptech+grants" },
              { label: "Women founder funding", href: "/opportunities?c=women-founders" },
              { label: "Equity-free", href: "/opportunities?equityFree=1" },
              { label: "Kerala", href: "/opportunities?state=Kerala" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="underline underline-offset-[3px] transition-colors duration-200 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <dl className="mt-12 grid max-w-[640px] grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-8 sm:grid-cols-4">
            <Stat value={total} label="Opportunities" />
            <Stat value={providerCount} label="Providers" />
            <Stat value={equityFree.total} label="Equity-free" />
            <Stat value={closingSoon.total} label="Closing in 30 days" />
          </dl>
        </div>
      </section>

      {/* Categories ------------------------------------------------------ */}
      {categories.length ? (
        <section className="section-y border-b border-line">
          <div className="page-shell">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="display-lg max-w-[14ch]">Explore by category</h2>
                <p className="lede mt-3 max-w-[46ch]">
                  Every opportunity is classified across type, industry, stage
                  and location — so you can narrow to exactly what fits.
                </p>
              </div>
              <Link href="/categories" className="btn btn-secondary">
                View all categories
                <ArrowRight className="size-4" strokeWidth={1.8} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group flex flex-col rounded-[12px] border border-line p-6 transition-[border-color,transform] duration-200 hover:-translate-y-[3px] hover:border-line-strong"
                >
                  <span className="grid size-10 place-items-center rounded-[9px] bg-subtle transition-colors duration-200 group-hover:bg-accent">
                    <Icon name={category.icon} className="size-[18px]" />
                  </span>
                  <h3 className="mt-5 text-[18px] font-medium tracking-[-0.022em]">
                    {category.name}
                  </h3>
                  {category.description ? (
                    <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
                      {category.description}
                    </p>
                  ) : null}
                  <p className="mt-5 flex items-center justify-between text-[13px] text-muted">
                    <span className="tabular-nums">
                      {(categoryCounts.get(category.slug) ?? 0).toLocaleString("en-IN")}{" "}
                      opportunities
                    </span>
                    <ArrowUpRight
                      className="size-4 transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Closing soon ---------------------------------------------------- */}
      {closingSoon.hits.length ? (
        <section className="section-y">
          <div className="page-shell">
            <Header
              eyebrow="Act now"
              title="Closing soon"
              description={`Deadlines inside the next ${CLOSING_SOON_DAYS * 4} days.`}
              href="/opportunities?closing=30"
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {closingSoon.hits.map((hit) => (
                <OpportunityCard key={hit.id} hit={hit} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* How the database is kept honest --------------------------------- */}
      <section className="pb-4">
        <div className="page-shell-wide">
          <div className="on-dark panel-dark relative overflow-hidden px-6 py-14 lg:px-16 lg:py-20">
            <div
              className="dot-grid-dark pointer-events-none absolute inset-0 opacity-40"
              aria-hidden="true"
            />
            <div className="relative grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.09em] text-on-dark-muted uppercase">
                  Why the deadlines are right
                </p>
                <h2 className="display-lg mt-4 max-w-[13ch] text-on-dark">
                  A person checks every record.
                </h2>
                <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-on-dark-muted">
                  Software watches official sources and spots changes. It never
                  publishes anything. Each opportunity, and every later change
                  to it, is reviewed against the provider&apos;s own page before it
                  reaches this site.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Pillar
                  icon={Waypoints}
                  title="Official sources only"
                  body="Every record links to the provider&apos;s own page. Nothing is copied from another directory."
                />
                <Pillar
                  icon={ShieldCheck}
                  title="Reviewed before publishing"
                  body="Automated extraction is a draft. An admin verifies it before anyone sees it."
                />
                <Pillar
                  icon={Timer}
                  title="Watched for changes"
                  body="Deadline moved? Funding changed? The change is detected, checked, then updated."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently added -------------------------------------------------- */}
      {recent.hits.length ? (
        <section className="section-y">
          <div className="page-shell">
            <Header
              eyebrow="Fresh"
              title="Recently added"
              description="The newest programmes to clear review."
              href="/opportunities?sort=newest"
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recent.hits.map((hit) => (
                <OpportunityCard key={hit.id} hit={hit} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Quick routes ---------------------------------------------------- */}
      <section className="border-t border-line bg-subtle py-14 lg:py-20">
        <div className="page-shell">
          <h2 className="display-md">Popular ways in</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Route
              href="/opportunities?provider=GOVERNMENT"
              title="Government grants"
              description="Central and state programmes for startups."
            />
            <Route
              href="/opportunities?equityFree=1"
              title="Equity-free funding"
              description={`${equityFree.total} programmes that take no equity.`}
            />
            <Route
              href="/opportunities?sort=largest"
              title="Largest funding"
              description={
                largest.hits[0]
                  ? `Up to ${largest.hits[0].fundingMax ? "₹" + Number(largest.hits[0].fundingMax).toLocaleString("en-IN") : "the largest amounts"}.`
                  : "The biggest amounts on offer."
              }
            />
            <Route
              href="/opportunities?closing=7"
              title="Closing this week"
              description="Deadlines in the next seven days."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-display text-[32px] leading-none font-medium tracking-[-0.035em] tabular-nums">
          {value.toLocaleString("en-IN")}
        </span>
        <span className="mt-1.5 block text-[13px] text-muted">{label}</span>
      </dd>
    </div>
  );
}

function Header({
  eyebrow,
  title,
  description,
  href,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display-md mt-2.5">{title}</h2>
        <p className="mt-2 text-[14.5px] text-muted">{description}</p>
      </div>
      <Link href={href} className="text-[14px] text-muted underline underline-offset-2 hover:text-ink">
        View all
      </Link>
    </div>
  );
}

function Pillar({
  icon: IconCmp,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-ink-3 p-5">
      <span className="grid size-8 place-items-center rounded-[7px] bg-accent text-ink">
        <IconCmp className="size-4" strokeWidth={1.7} />
      </span>
      <h3 className="mt-4 text-[15px] font-medium tracking-[-0.015em] text-on-dark">
        {title}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-on-dark-muted">{body}</p>
    </div>
  );
}

function Route({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[12px] border border-line bg-canvas p-5 transition-[border-color,transform] duration-200 hover:-translate-y-[2px] hover:border-line-strong"
    >
      <p className="flex items-center justify-between text-[15.5px] font-medium tracking-[-0.02em]">
        {title}
        <ArrowUpRight
          className="size-4 text-faint transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
          strokeWidth={1.7}
          aria-hidden="true"
        />
      </p>
      <p className="mt-1.5 text-[13.5px] text-muted">{description}</p>
    </Link>
  );
}
