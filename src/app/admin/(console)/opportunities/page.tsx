import Link from "next/link";
import type { Prisma, WorkflowStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { WorkflowBadge, LifecycleBadge } from "@/components/admin/status-badge";
import { CLOSING_SOON_DAYS, lifecycleStatus } from "@/lib/opportunity-status";
import { cn, formatDate, fundingRangeLabel } from "@/lib/utils";
import { WORKFLOW_LABEL } from "@/lib/opportunity-status";

export const metadata = { title: "Opportunities" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const STATUS_TABS: (WorkflowStatus | "ALL")[] = [
  "ALL",
  "PUBLISHED",
  "DRAFT",
  "PENDING_REVIEW",
  "UPDATE_PENDING_REVIEW",
  "ARCHIVED",
];

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; closing?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = params.status ?? "ALL";
  const query = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where: Prisma.OpportunityWhereInput = {};
  if (status !== "ALL") where.workflowStatus = status as WorkflowStatus;
  if (params.closing === "soon") {
    where.isRollingDeadline = false;
    where.applicationDeadline = {
      gte: new Date(),
      lte: new Date(Date.now() + CLOSING_SOON_DAYS * 86_400_000),
    };
  }
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { providerName: { contains: query, mode: "insensitive" } },
      { programmeName: { contains: query, mode: "insensitive" } },
    ];
  }

  const [rows, total, statusCounts] = await Promise.all([
    prisma.opportunity.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        categories: {
          where: { isPrimary: true },
          include: { category: { select: { name: true } } },
          take: 1,
        },
        _count: { select: { categories: true } },
      },
    }),
    prisma.opportunity.count({ where }),
    prisma.opportunity.groupBy({ by: ["workflowStatus"], _count: { _all: true } }),
  ]);

  const countFor = (tab: string) =>
    tab === "ALL"
      ? statusCounts.reduce((sum, s) => sum + s._count._all, 0)
      : (statusCounts.find((s) => s.workflowStatus === tab)?._count._all ?? 0);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const linkFor = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { status, q: query, closing: params.closing, ...next };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "ALL") sp.set(k, v);
    }
    const qs = sp.toString();
    return `/admin/opportunities${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Opportunities"
        description="Every record in the funding database, at every stage of its life. Only PUBLISHED records appear on the public site."
        actions={
          <Link href="/admin/opportunities/new" className="btn btn-primary btn-sm">
            Add opportunity
          </Link>
        }
      />

      <PageBody>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap gap-1.5" aria-label="Status">
            {STATUS_TABS.map((tab) => {
              const isActive = tab === status;
              return (
                <Link
                  key={tab}
                  href={linkFor({ status: tab, page: undefined })}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-[7px] border px-3 py-1.5 text-[13px] transition-colors duration-200",
                    isActive
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  {tab === "ALL" ? "All" : (WORKFLOW_LABEL[tab] ?? tab)}
                  <span
                    className={cn(
                      "text-[11.5px] tabular-nums",
                      isActive ? "text-accent" : "text-faint",
                    )}
                  >
                    {countFor(tab)}
                  </span>
                </Link>
              );
            })}
          </nav>

          <form className="ml-auto flex items-center gap-2" action="/admin/opportunities">
            {status !== "ALL" ? (
              <input type="hidden" name="status" value={status} />
            ) : null}
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search title or provider"
              aria-label="Search opportunities"
              className="field h-9 w-[220px] text-[13.5px]"
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
          </form>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-subtle">
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    Opportunity
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    Window
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    Funding
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    Deadline
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center">
                      <p className="text-[14px] text-muted">
                        {query || status !== "ALL"
                          ? "No opportunities match this view."
                          : "No opportunities yet."}
                      </p>
                      <Link
                        href="/admin/opportunities/new"
                        className="btn btn-secondary btn-sm mt-4"
                      >
                        Add the first one
                      </Link>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-subtle/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/opportunities/${row.id}`}
                          className="block max-w-[42ch] truncate text-[13.5px] font-medium underline-offset-2 hover:underline"
                        >
                          {row.title}
                        </Link>
                        <span className="mt-0.5 block max-w-[42ch] truncate text-[12px] text-muted">
                          {row.providerName}
                          {row.categories[0]
                            ? ` · ${row.categories[0].category.name}`
                            : ""}
                          {row._count.categories > 1
                            ? ` +${row._count.categories - 1}`
                            : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <WorkflowBadge status={row.workflowStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <LifecycleBadge status={lifecycleStatus(row)} />
                      </td>
                      <td className="px-4 py-3 text-[13px]">
                        {fundingRangeLabel(
                          row.fundingMin?.toString() ?? null,
                          row.fundingMax?.toString() ?? null,
                          row.currency,
                          row.fundingAmountText,
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px]">
                        {row.isRollingDeadline
                          ? "Rolling"
                          : formatDate(row.applicationDeadline)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted">
                        {formatDate(row.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {pages > 1 ? (
          <nav className="mt-5 flex items-center justify-between" aria-label="Pagination">
            <p className="text-[13px] text-muted">
              Page {page} of {pages} · {total} records
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={linkFor({ page: String(page - 1) })} className="btn btn-secondary btn-sm">
                  Previous
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={linkFor({ page: String(page + 1) })} className="btn btn-secondary btn-sm">
                  Next
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </PageBody>
    </>
  );
}
