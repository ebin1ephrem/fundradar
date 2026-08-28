import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Crawl jobs" };
export const dynamic = "force-dynamic";

const TONE: Record<JobStatus, string> = {
  QUEUED: "text-faint",
  RUNNING: "pill-accent",
  SUCCEEDED: "border-ok/30 bg-ok/5 text-ok",
  PARTIAL: "border-warn/40 bg-warn/5 text-warn",
  FAILED: "border-danger/30 bg-danger/5 text-danger",
  CANCELLED: "text-faint",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  await requireAdmin();
  const { source } = await searchParams;

  const where = source ? { sourceId: source } : {};

  const [jobs, queued, running, failed, totals] = await Promise.all([
    prisma.crawlJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { source: { select: { id: true, name: true } }, createdBy: { select: { name: true } } },
    }),
    prisma.crawlJob.count({ where: { ...where, status: "QUEUED" } }),
    prisma.crawlJob.count({ where: { ...where, status: "RUNNING" } }),
    prisma.crawlJob.count({ where: { ...where, status: "FAILED" } }),
    prisma.crawlJob.aggregate({
      where,
      _sum: { opportunitiesFound: true, changesFound: true, pagesProcessed: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Crawl jobs"
        description="Every run is a discrete job, so it works the same on a schedule as it does when you press Run now."
        actions={
          <Link href="/admin/sources" className="btn btn-secondary btn-sm">
            Sources
          </Link>
        }
      />

      <PageBody>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile label="Queued" value={queued} />
          <StatTile label="Running" value={running} emphasis />
          <StatTile label="Failed" value={failed} emphasis />
          <StatTile label="Pages read" value={totals._sum.pagesProcessed ?? 0} />
          <StatTile
            label="Drafts created"
            value={totals._sum.opportunitiesFound ?? 0}
            hint={`${totals._sum.changesFound ?? 0} changes detected`}
          />
        </div>

        {jobs.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-line-strong px-6 py-14 text-center text-[14px] text-muted">
            No crawl jobs yet.
          </p>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-subtle">
                    {["Source", "Status", "Pages", "Result", "Started", "Finished"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {jobs.map((job) => (
                    <tr key={job.id} className="align-top hover:bg-subtle/60">
                      <td className="px-4 py-3">
                        {job.source ? (
                          <Link
                            href={`/admin/sources/${job.source.id}`}
                            className="block max-w-[30ch] truncate text-[13.5px] underline-offset-2 hover:underline"
                          >
                            {job.source.name}
                          </Link>
                        ) : (
                          <span className="text-[13.5px] text-muted">Source removed</span>
                        )}
                        <span className="block text-[12px] text-muted">
                          {job.type.replace(/_/g, " ").toLowerCase()}
                          {job.createdBy ? ` · ${job.createdBy.name}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("pill", TONE[job.status])}>
                          {job.status.toLowerCase()}
                        </span>
                        {job.attempts > 1 ? (
                          <span className="mt-1 block text-[11.5px] text-faint">
                            attempt {job.attempts}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums">
                        {job.pagesProcessed}/{job.pagesFound}
                        {job.pagesSkipped ? (
                          <span className="block text-[12px] text-muted">
                            {job.pagesSkipped} skipped
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[13px]">
                        {job.opportunitiesFound} new · {job.changesFound} changed
                        {job.error ? (
                          <span className="mt-1 block max-w-[36ch] truncate text-[12px] text-danger">
                            {job.error}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted">
                        {formatDate(job.startedAt ?? job.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted">
                        {job.finishedAt ? formatDate(job.finishedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}
