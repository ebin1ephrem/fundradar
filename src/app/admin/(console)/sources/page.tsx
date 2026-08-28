import Link from "next/link";
import type { SourceHealth } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { FormNotice } from "@/components/ui/form";
import { cn, formatDate } from "@/lib/utils";
import { runSourceNowAction, toggleSourceAction } from "./actions";
import { BulkAddForm } from "./bulk-form";

export const metadata = { title: "Sources" };
export const dynamic = "force-dynamic";

const HEALTH_TONE: Record<SourceHealth, string> = {
  HEALTHY: "border-ok/30 bg-ok/5 text-ok",
  PENDING: "text-faint",
  STALE: "border-warn/40 bg-warn/5 text-warn",
  ERROR: "border-danger/30 bg-danger/5 text-danger",
  BLOCKED: "border-danger/30 bg-danger/5 text-danger",
  MANUAL_MONITORING_REQUIRED: "border-warn/40 bg-warn/5 text-warn",
};

const HEALTH_LABEL: Record<SourceHealth, string> = {
  HEALTHY: "Healthy",
  PENDING: "Not checked yet",
  STALE: "Partial",
  ERROR: "Error",
  BLOCKED: "Blocked",
  MANUAL_MONITORING_REQUIRED: "Manual only",
};

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; skipped?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const sources = await prisma.source.findMany({
    orderBy: [{ enabled: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { collectionItems: true, opportunities: true, jobs: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Sources"
        description="Sites and pages we watch. Collection is automatic; publishing never is."
        actions={
          <Link href="/admin/sources/new" className="btn btn-primary btn-sm">
            Add a source
          </Link>
        }
      />

      <PageBody>
        {params.added ? (
          <div className="mb-5">
            <FormNotice
              message={`Added ${params.added} source${params.added === "1" ? "" : "s"}${
                params.skipped && params.skipped !== "0"
                  ? `, skipped ${params.skipped} that were duplicates or unusable.`
                  : "."
              }`}
            />
          </div>
        ) : null}

        {sources.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-line-strong px-6 py-14 text-center">
            <p className="text-[16px] font-medium tracking-[-0.02em]">
              No sources being watched yet
            </p>
            <p className="mx-auto mt-2 max-w-[48ch] text-[14px] text-muted">
              Add the page a provider publishes its programmes on, and we will
              check it on a schedule and tell you what changed.
            </p>
            <Link href="/admin/sources/new" className="btn btn-primary btn-sm mt-6">
              Add the first source
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-subtle">
                    {["Source", "How", "Health", "Last checked", "Found", ""].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sources.map((source) => (
                    <tr
                      key={source.id}
                      className={cn("hover:bg-subtle/60", !source.enabled && "opacity-55")}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/sources/${source.id}`}
                          className="block max-w-[34ch] truncate text-[13.5px] font-medium underline-offset-2 hover:underline"
                        >
                          {source.name}
                        </Link>
                        <span className="block max-w-[34ch] truncate text-[12px] text-muted">
                          {source.url}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px]">
                        <span className="block">
                          {source.crawlType.replace(/_/g, " ").toLowerCase()}
                        </span>
                        <span className="block text-[12px] text-muted">
                          {source.checkFrequency.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("pill", HEALTH_TONE[source.health])}>
                          {HEALTH_LABEL[source.health]}
                        </span>
                        {source.robotsAllowed === false ? (
                          <span className="mt-1 block text-[11.5px] text-warn">
                            robots.txt says no
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted">
                        {source.lastCheckedAt ? formatDate(source.lastCheckedAt) : "Never"}
                        {source.nextCheckAt ? (
                          <span className="block text-[12px] text-faint">
                            next {formatDate(source.nextCheckAt)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums">
                        {source._count.opportunities} published
                        <span className="block text-[12px] text-muted">
                          {source._count.collectionItems} collected
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {source.autoCollect ? (
                            <form action={runSourceNowAction}>
                              <input type="hidden" name="id" value={source.id} />
                              <button type="submit" className="btn btn-secondary btn-sm">
                                Run now
                              </button>
                            </form>
                          ) : null}
                          <form action={toggleSourceAction}>
                            <input type="hidden" name="id" value={source.id} />
                            <button type="submit" className="btn btn-ghost btn-sm">
                              {source.enabled ? "Pause" : "Resume"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <section className="mt-8 max-w-[720px]">
          <h2 className="eyebrow mb-3">Add several at once</h2>
          <BulkAddForm />
        </section>
      </PageBody>
    </>
  );
}
