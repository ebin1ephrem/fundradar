import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { publiclyVisible } from "@/lib/visibility";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const WINDOWS = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
];

const EVENT_LABEL: Record<string, string> = {
  arrived: "Arrivals",
  opportunity_view: "Opportunity views",
  category_view: "Category views",
  search: "Searches",
  unlock_requested: "Unlock prompts shown",
  apply_clicked: "Clicks to official source",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  await requireAdmin();
  const { window: windowKey } = await searchParams;
  const active = WINDOWS.find((w) => w.key === windowKey) ?? WINDOWS[1];
  const since = new Date(Date.now() - active.days * 86_400_000);

  const [
    eventCounts,
    newLeads,
    totalLeads,
    visitors,
    published,
    topOpportunities,
    topCategories,
    topSearches,
    emailConsent,
    whatsappConsent,
  ] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.lead.count({ where: { createdAt: { gte: since } } }),
    prisma.lead.count(),
    prisma.visitor.count({ where: { firstSeenAt: { gte: since } } }),
    prisma.opportunity.count({ where: publiclyVisible }),
    prisma.analyticsEvent.groupBy({
      by: ["opportunityId"],
      where: {
        createdAt: { gte: since },
        eventType: "opportunity_view",
        opportunityId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { opportunityId: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["categoryId"],
      where: {
        createdAt: { gte: since },
        eventType: "category_view",
        categoryId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: 10,
    }),
    prisma.leadActivity.findMany({
      where: { createdAt: { gte: since }, type: "search" },
      select: { description: true },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    prisma.lead.count({ where: { emailMarketingConsent: true } }),
    prisma.lead.count({ where: { whatsappMarketingConsent: true } }),
  ]);

  const byEvent = new Map(eventCounts.map((e) => [e.eventType, e._count._all]));
  const views = byEvent.get("opportunity_view") ?? 0;
  const prompts = byEvent.get("unlock_requested") ?? 0;

  const [opportunityNames, categoryNames] = await Promise.all([
    prisma.opportunity.findMany({
      where: { id: { in: topOpportunities.map((o) => o.opportunityId!).filter(Boolean) } },
      select: { id: true, title: true, providerName: true },
    }),
    prisma.category.findMany({
      where: { id: { in: topCategories.map((c) => c.categoryId!).filter(Boolean) } },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const opportunityById = new Map(opportunityNames.map((o) => [o.id, o]));
  const categoryById = new Map(categoryNames.map((c) => [c.id, c]));

  // Search terms come out of the activity description, which is the only place
  // the query text is kept.
  const searchTally = new Map<string, number>();
  for (const row of topSearches) {
    const match = row.description?.match(/^Searched for "(.+)"$/);
    if (!match) continue;
    const term = match[1].trim().toLowerCase();
    if (!term) continue;
    searchTally.set(term, (searchTally.get(term) ?? 0) + 1);
  }
  const searches = [...searchTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="What founders are actually looking at, and how many of them tell us where to send the signal."
      />

      <PageBody>
        <nav className="mb-6 flex gap-1.5" aria-label="Time window">
          {WINDOWS.map((w) => (
            <Link
              key={w.key}
              href={`/admin/analytics?window=${w.key}`}
              aria-current={w.key === active.key ? "page" : undefined}
              className={cn(
                "rounded-[7px] border px-3 py-1.5 text-[13px] transition-colors duration-200",
                w.key === active.key
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              Last {w.label}
            </Link>
          ))}
        </nav>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="New visitors" value={visitors} />
          <Stat label="New leads" value={newLeads} />
          <Stat
            label="Prompt → lead"
            value={prompts > 0 ? `${Math.round((newLeads / prompts) * 100)}%` : "—"}
            hint={`${prompts} prompts shown`}
          />
          <Stat
            label="Published opportunities"
            value={published}
            hint={`${totalLeads} leads all time`}
          />
        </section>

        <section className="mt-8">
          <h2 className="text-[15px] font-medium tracking-[-0.02em]">Activity</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(EVENT_LABEL).map(([key, label]) => (
              <Stat key={key} label={label} value={byEvent.get(key) ?? 0} />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-[15px] font-medium tracking-[-0.02em]">Consent</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Email subscribers" value={emailConsent} />
            <Stat label="WhatsApp subscribers" value={whatsappConsent} />
            <Stat
              label="Views per lead"
              value={newLeads > 0 ? (views / newLeads).toFixed(1) : "—"}
            />
            <Stat
              label="Applies"
              value={byEvent.get("apply_clicked") ?? 0}
              hint="Clicks through to the provider"
            />
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-3">
          <Table
            title="Most viewed opportunities"
            empty="No opportunity views in this window."
            rows={topOpportunities.map((row) => {
              const o = opportunityById.get(row.opportunityId!);
              return {
                key: row.opportunityId!,
                label: o?.title ?? "Removed",
                sub: o?.providerName ?? null,
                href: o ? `/admin/opportunities/${o.id}` : null,
                count: row._count._all,
              };
            })}
          />
          <Table
            title="Most viewed categories"
            empty="No category views in this window."
            rows={topCategories.map((row) => {
              const c = categoryById.get(row.categoryId!);
              return {
                key: row.categoryId!,
                label: c?.name ?? "Removed",
                sub: c?.slug ?? null,
                href: c ? `/categories/${c.slug}` : null,
                count: row._count._all,
              };
            })}
          />
          <Table
            title="What founders searched for"
            empty="No searches in this window."
            rows={searches.map(([term, count]) => ({
              key: term,
              label: term,
              sub: null,
              href: `/opportunities?q=${encodeURIComponent(term)}`,
              count,
            }))}
          />
        </div>
      </PageBody>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <span className="block font-display text-[28px] leading-none font-medium tracking-[-0.035em] tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </span>
      <span className="mt-2 block text-[13px]">{label}</span>
      {hint ? <span className="mt-0.5 block text-[12px] text-muted">{hint}</span> : null}
    </div>
  );
}

function Table({
  title,
  rows,
  empty,
}: {
  title: string;
  empty: string;
  rows: {
    key: string;
    label: string;
    sub: string | null;
    href: string | null;
    count: number;
  }[];
}) {
  return (
    <section className="card overflow-hidden">
      <h2 className="border-b border-line px-5 py-3.5 text-[14px] font-medium">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center gap-3 px-5 py-2.5 text-[13px]"
            >
              <div className="min-w-0 flex-1">
                {row.href ? (
                  <Link
                    href={row.href}
                    className="block truncate underline-offset-2 hover:underline"
                  >
                    {row.label}
                  </Link>
                ) : (
                  <span className="block truncate">{row.label}</span>
                )}
                {row.sub ? (
                  <span className="block truncate text-[11.5px] text-muted">
                    {row.sub}
                  </span>
                ) : null}
              </div>
              <span className="shrink-0 tabular-nums text-muted">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
