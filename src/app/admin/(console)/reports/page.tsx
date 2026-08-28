import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { cn, formatDate } from "@/lib/utils";
import { reportError as reportCopy } from "@/content/copy";
import { resolveReportAction } from "./actions";

export const metadata = { title: "Reported errors" };
export const dynamic = "force-dynamic";

const LABEL = new Map(reportCopy.reasons.map((r) => [r.value, r.label]));

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  await requireAdmin();
  const { show } = await searchParams;
  const resolved = show === "resolved";

  const [reports, openCount, resolvedCount] = await Promise.all([
    prisma.errorReport.findMany({
      where: { resolved },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        opportunity: { select: { id: true, slug: true, title: true, providerName: true } },
        resolvedBy: { select: { name: true } },
      },
    }),
    prisma.errorReport.count({ where: { resolved: false } }),
    prisma.errorReport.count({ where: { resolved: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Reported errors"
        description="What founders told us looks wrong. A report never changes a listing — you decide what, if anything, to correct."
      />

      <PageBody>
        <nav className="mb-5 flex gap-1.5" aria-label="Report status">
          {[
            { key: "open", label: "Open", count: openCount, href: "/admin/reports" },
            {
              key: "resolved",
              label: "Handled",
              count: resolvedCount,
              href: "/admin/reports?show=resolved",
            },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={
                (tab.key === "resolved") === resolved ? "page" : undefined
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-[7px] border px-3 py-1.5 text-[13px] transition-colors duration-200",
                (tab.key === "resolved") === resolved
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "text-[11.5px] tabular-nums",
                  (tab.key === "resolved") === resolved ? "text-accent" : "text-faint",
                )}
              >
                {tab.count}
              </span>
            </Link>
          ))}
        </nav>

        {reports.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="text-[16px] font-medium tracking-[-0.02em]">
              {resolved ? "Nothing handled yet" : "No open reports"}
            </p>
            <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-muted">
              Founders can report a problem from the bottom of any published
              listing.
            </p>
          </div>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {reports.map((report) => (
              <li key={report.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="pill">
                        {LABEL.get(report.type) ?? report.type}
                      </span>
                      <Link
                        href={`/admin/opportunities/${report.opportunity.id}`}
                        className="max-w-[52ch] truncate text-[14px] font-medium underline-offset-2 hover:underline"
                      >
                        {report.opportunity.title}
                      </Link>
                    </p>
                    <p className="mt-1 text-[12px] text-muted">
                      {report.opportunity.providerName} · {formatDate(report.createdAt)}
                      {report.reporterEmail ? ` · ${report.reporterEmail}` : ""}
                      {report.resolvedBy ? ` · handled by ${report.resolvedBy.name}` : ""}
                    </p>
                    <p className="mt-2 max-w-[90ch] text-[13.5px] leading-relaxed">
                      {report.message}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/opportunities/${report.opportunity.slug}`}
                      target="_blank"
                      className="btn btn-secondary btn-sm"
                    >
                      View listing
                    </Link>
                    {resolved ? null : (
                      <form action={resolveReportAction}>
                        <input type="hidden" name="id" value={report.id} />
                        <button type="submit" className="btn btn-primary btn-sm">
                          Mark handled
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
