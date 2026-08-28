import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { FormError, FormNotice } from "@/components/ui/form";
import { cn, formatDate } from "@/lib/utils";
import { SourceForm } from "../source-form";
import { checkRobotsAction, runSourceNowAction, toggleSourceAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;

  const source = await prisma.source.findUnique({
    where: { id },
    include: {
      jobs: { orderBy: { createdAt: "desc" }, take: 6 },
      _count: { select: { collectionItems: true, opportunities: true } },
    },
  });

  if (!source) notFound();

  const lastJob = source.jobs[0];
  const notes = (lastJob?.result as { notes?: string[] } | null)?.notes ?? [];

  return (
    <>
      <PageHeader
        title={source.name}
        breadcrumbs={[{ label: "Sources", href: "/admin/sources" }, { label: source.name }]}
        description={source.url}
        actions={
          <>
            {source.autoCollect ? (
              <form action={runSourceNowAction}>
                <input type="hidden" name="id" value={source.id} />
                <button type="submit" className="btn btn-primary btn-sm">
                  Run now
                </button>
              </form>
            ) : null}
            <form action={toggleSourceAction}>
              <input type="hidden" name="id" value={source.id} />
              <button type="submit" className="btn btn-secondary btn-sm">
                {source.enabled ? "Pause" : "Resume"}
              </button>
            </form>
          </>
        }
      />

      <PageBody>
        {flags.error ? (
          <div className="mb-5">
            <FormError message={flags.error} />
          </div>
        ) : null}
        {flags.saved || flags.ran ? (
          <div className="mb-5">
            <FormNotice
              message={
                flags.ran
                  ? lastJob
                    ? `Crawl ${lastJob.status.toLowerCase()}: read ${lastJob.pagesProcessed} page${lastJob.pagesProcessed === 1 ? "" : "s"}, ${lastJob.opportunitiesFound} new draft${lastJob.opportunitiesFound === 1 ? "" : "s"}, ${lastJob.changesFound} change${lastJob.changesFound === 1 ? "" : "s"}.`
                    : "Crawl finished."
                  : "Source saved."
              }
            />
          </div>
        ) : null}

        {source.health === "MANUAL_MONITORING_REQUIRED" ? (
          <div className="mb-6 rounded-[12px] border border-warn/30 bg-warn/5 p-5">
            <p className="text-[14px] font-medium text-warn">Manual monitoring only</p>
            <p className="mt-1.5 max-w-[70ch] text-[13.5px] text-muted">
              {source.lastError ??
                "This site asks crawlers not to read it, or requires a sign-in."}{" "}
              We do not go around that. Open the page yourself and paste the text.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/admin/ingest/paste" className="btn btn-primary btn-sm">
                Paste text instead
              </Link>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-secondary btn-sm"
              >
                Open the source
              </a>
            </div>
          </div>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[1fr_320px] xl:items-start">
          <SourceForm source={source} />

          <aside className="grid gap-4">
            <section className="card p-4">
              <h2 className="mb-2.5 text-[13px] font-medium">Health</h2>
              <dl className="grid gap-1.5 text-[12.5px]">
                <Row label="Status" value={source.health.replace(/_/g, " ").toLowerCase()} />
                <Row label="Last checked" value={formatDate(source.lastCheckedAt)} />
                <Row label="Last success" value={formatDate(source.lastSuccessfulCheckAt)} />
                <Row label="Last change" value={formatDate(source.lastChangeDetectedAt)} />
                <Row label="Next check" value={formatDate(source.nextCheckAt)} />
                <Row label="Errors in a row" value={String(source.errorCount)} />
                <Row
                  label="robots.txt"
                  value={
                    source.robotsAllowed === null
                      ? "Not checked"
                      : source.robotsAllowed
                        ? "Allows us"
                        : "Asks us not to"
                  }
                />
                <Row label="Collected" value={String(source._count.collectionItems)} />
                <Row label="Published from here" value={String(source._count.opportunities)} />
              </dl>
              {source.lastError ? (
                <p className="mt-3 border-t border-line pt-2.5 text-[12px] text-warn">
                  {source.lastError}
                </p>
              ) : null}
              <form action={checkRobotsAction} className="mt-3">
                <input type="hidden" name="id" value={source.id} />
                <button type="submit" className="btn btn-secondary btn-sm w-full">
                  Check robots.txt
                </button>
              </form>
            </section>

            <section className="card p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[13px] font-medium">Recent runs</h2>
                <Link
                  href={`/admin/jobs?source=${source.id}`}
                  className="text-[12px] text-muted underline-offset-2 hover:text-ink hover:underline"
                >
                  All runs
                </Link>
              </div>
              {source.jobs.length === 0 ? (
                <p className="text-[12.5px] text-muted">Not run yet.</p>
              ) : (
                <ol className="grid gap-2.5">
                  {source.jobs.map((job) => (
                    <li key={job.id} className="border-l border-line pl-3">
                      <p className="text-[12.5px]">
                        <span
                          className={cn(
                            job.status === "FAILED" && "text-danger",
                            job.status === "PARTIAL" && "text-warn",
                          )}
                        >
                          {job.status.toLowerCase()}
                        </span>{" "}
                        · {job.pagesProcessed} read · {job.opportunitiesFound} new ·{" "}
                        {job.changesFound} changed
                      </p>
                      <p className="text-[11.5px] text-faint">
                        {formatDate(job.finishedAt ?? job.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {notes.length ? (
              <section className="card p-4">
                <h2 className="mb-2 text-[13px] font-medium">What the last run skipped</h2>
                <ul className="grid gap-1.5">
                  {notes.slice(0, 8).map((note, i) => (
                    <li key={i} className="text-[11.5px] leading-relaxed text-muted">
                      {note}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>
      </PageBody>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}
