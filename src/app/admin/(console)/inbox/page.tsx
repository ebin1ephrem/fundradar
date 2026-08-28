import Link from "next/link";
import type { CollectionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { ConfidenceDot } from "@/components/admin/confidence";
import { cn, formatDate } from "@/lib/utils";
import { ignoreCollectionItemAction } from "../review/actions";

export const metadata = { title: "Collection inbox" };
export const dynamic = "force-dynamic";

const TABS: { key: string; label: string; where: Prisma.CollectionItemWhereInput }[] = [
  {
    key: "open",
    label: "Needs a look",
    where: { status: { in: ["NEW", "EXTRACTED", "FAILED"] }, opportunityId: null },
  },
  { key: "promoted", label: "Became a draft", where: { status: "PROMOTED" } },
  { key: "failed", label: "Could not read", where: { status: "FAILED" } },
  { key: "ignored", label: "Ignored", where: { status: "IGNORED" } },
  { key: "all", label: "Everything", where: {} },
];

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];

  const [items, counts] = await Promise.all([
    prisma.collectionItem.findMany({
      where: active.where,
      orderBy: { discoveredAt: "desc" },
      take: 80,
      include: {
        source: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        opportunity: { select: { id: true, title: true, workflowStatus: true } },
      },
    }),
    Promise.all(
      TABS.map(
        async (t) => [t.key, await prisma.collectionItem.count({ where: t.where })] as const,
      ),
    ),
  ]);

  const countByTab = new Map(counts);

  return (
    <>
      <PageHeader
        title="Collection inbox"
        description="Everything the platform has collected, before it becomes an opportunity. Nothing here is public."
        actions={
          <Link href="/admin/ingest/paste" className="btn btn-primary btn-sm">
            Paste text
          </Link>
        }
      />

      <PageBody>
        <nav className="mb-5 flex flex-wrap gap-1.5" aria-label="Inbox">
          {TABS.map((t) => {
            const isActive = t.key === active.key;
            return (
              <Link
                key={t.key}
                href={`/admin/inbox?tab=${t.key}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[7px] border px-3 py-1.5 text-[13px] transition-colors duration-200",
                  isActive
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "text-[11.5px] tabular-nums",
                    isActive ? "text-accent" : "text-faint",
                  )}
                >
                  {countByTab.get(t.key) ?? 0}
                </span>
              </Link>
            );
          })}
        </nav>

        {items.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-line-strong px-6 py-14 text-center text-[14px] text-muted">
            Nothing collected here yet.
          </p>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-subtle">
                    {["What we found", "Read as", "Where from", "Collected", "Status", ""].map(
                      (heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-subtle/60">
                      <td className="px-4 py-3">
                        <p className="max-w-[42ch] truncate text-[13.5px] font-medium">
                          {item.pageTitle ?? item.opportunity?.title ?? "Untitled material"}
                        </p>
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="block max-w-[42ch] truncate text-[12px] text-muted underline-offset-2 hover:text-ink hover:underline"
                          >
                            {item.url}
                          </a>
                        ) : (
                          <p className="max-w-[42ch] truncate text-[12px] text-muted">
                            {item.rawText?.slice(0, 90)}…
                          </p>
                        )}
                        {item.extractionError ? (
                          <p className="mt-1 max-w-[42ch] truncate text-[11.5px] text-warn">
                            {item.extractionError}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="pill">
                          {item.classification.replace(/_/g, " ").toLowerCase()}
                        </span>
                        <span className="mt-1 block">
                          <ConfidenceDot
                            confidence={item.classificationConfidence}
                            showLabel
                          />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px]">
                        <span className="block">
                          {item.origin.replace(/_/g, " ").toLowerCase()}
                        </span>
                        {item.source ? (
                          <Link
                            href={`/admin/sources/${item.source.id}`}
                            className="block text-[12px] text-muted underline-offset-2 hover:text-ink hover:underline"
                          >
                            {item.source.name}
                          </Link>
                        ) : item.createdBy ? (
                          <span className="block text-[12px] text-muted">
                            {item.createdBy.name}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted">
                        {formatDate(item.discoveredAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {item.opportunity ? (
                            <Link
                              href={`/admin/review/${item.opportunity.id}`}
                              className="btn btn-secondary btn-sm"
                            >
                              Review
                            </Link>
                          ) : null}
                          {item.status !== "IGNORED" && !item.opportunity ? (
                            <form action={ignoreCollectionItemAction}>
                              <input type="hidden" name="collectionItemId" value={item.id} />
                              <button type="submit" className="btn btn-ghost btn-sm">
                                Ignore
                              </button>
                            </form>
                          ) : null}
                        </div>
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

function StatusPill({ status }: { status: CollectionStatus }) {
  const tone: Partial<Record<CollectionStatus, string>> = {
    PROMOTED: "pill-dark",
    FAILED: "border-danger/30 text-danger",
    IGNORED: "text-faint",
  };
  return (
    <span className={cn("pill", tone[status])}>{status.toLowerCase()}</span>
  );
}
