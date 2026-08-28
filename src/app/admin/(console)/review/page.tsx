import Link from "next/link";
import type { Prisma, ReviewItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { FormError, FormNotice } from "@/components/ui/form";
import { ConfidenceDot } from "@/components/admin/confidence";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Review queue" };
export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["UNASSIGNED", "ASSIGNED", "UNDER_REVIEW", "READY_FOR_APPROVAL"] as const;

const TABS: { key: string; label: string; where: Prisma.ReviewItemWhereInput }[] = [
  {
    key: "new",
    label: "New opportunities",
    where: { type: "NEW_OPPORTUNITY", status: { in: [...OPEN_STATUSES] } },
  },
  {
    key: "updates",
    label: "Updates",
    where: { type: "UPDATE", status: { in: [...OPEN_STATUSES] } },
  },
  {
    key: "duplicates",
    label: "Possible duplicates",
    where: { type: "POSSIBLE_DUPLICATE", status: { in: [...OPEN_STATUSES] } },
  },
  {
    key: "low",
    label: "Low confidence",
    where: {
      status: { in: [...OPEN_STATUSES] },
      overallConfidence: { lt: 0.7 },
    },
  },
  {
    key: "missing",
    label: "Missing information",
    where: {
      status: { in: [...OPEN_STATUSES] },
      opportunity: {
        OR: [{ eligibilitySummary: null }, { applicationUrl: null, applicationInstructions: null }],
      },
    },
  },
  {
    key: "rejected",
    label: "Rejected",
    where: { status: "REJECTED" },
  },
];

const NOTICES: Record<string, string> = {
  published: "Published. It is live on the public site now.",
  rejected: "Rejected. We will not surface the same material again.",
  updated: "Update approved and applied. The previous version is kept in history.",
  updateRejected: "Update rejected. The public record is unchanged.",
  duplicateResolved: "Duplicate resolved.",
};

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const active = TABS.find((t) => t.key === params.tab) ?? TABS[0];

  const [items, counts] = await Promise.all([
    prisma.reviewItem.findMany({
      where: active.where,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 60,
      include: {
        opportunity: {
          select: {
            id: true,
            title: true,
            providerName: true,
            workflowStatus: true,
            ingestionMethod: true,
          },
        },
        assignedReviewer: { select: { name: true } },
        collectionItem: { select: { origin: true, url: true } },
      },
    }),
    Promise.all(
      TABS.map(async (tab) => [tab.key, await prisma.reviewItem.count({ where: tab.where })] as const),
    ),
  ]);

  const countByTab = new Map(counts);
  const notice = Object.keys(NOTICES).find((key) => params[key]);

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Everything automation has prepared. Nothing here is public until you approve it."
        actions={
          <Link href="/admin/opportunities/new" className="btn btn-primary btn-sm">
            Add opportunity
          </Link>
        }
      />

      <PageBody>
        {params.error ? (
          <div className="mb-5">
            <FormError message={params.error} />
          </div>
        ) : null}
        {notice ? (
          <div className="mb-5">
            <FormNotice message={NOTICES[notice]} />
          </div>
        ) : null}

        <nav className="mb-5 flex flex-wrap gap-1.5" aria-label="Review queue">
          {TABS.map((tab) => {
            const isActive = tab.key === active.key;
            const count = countByTab.get(tab.key) ?? 0;
            return (
              <Link
                key={tab.key}
                href={`/admin/review?tab=${tab.key}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[7px] border px-3 py-1.5 text-[13px] transition-colors duration-200",
                  isActive
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "text-[11.5px] tabular-nums",
                    isActive ? "text-accent" : "text-faint",
                  )}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>

        {items.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="text-[16px] font-medium tracking-[-0.02em]">Nothing waiting here</p>
            <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-muted">
              Add a source to monitor, paste something you were sent, or add a
              single URL.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href="/admin/ingest/paste" className="btn btn-primary btn-sm">
                Paste text
              </Link>
              <Link href="/admin/sources/new" className="btn btn-secondary btn-sm">
                Add a source
              </Link>
            </div>
          </div>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={hrefFor(item.type, item.id, item.opportunityId)}
                    className="block max-w-[60ch] truncate text-[14px] font-medium underline-offset-2 hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {item.opportunity?.providerName ?? "Provider not stated"}
                    {" · "}
                    {(item.collectionItem?.origin ?? item.opportunity?.ingestionMethod ?? "")
                      .replace(/_/g, " ")
                      .toLowerCase()}
                    {" · "}
                    {formatDate(item.createdAt)}
                    {item.assignedReviewer ? ` · ${item.assignedReviewer.name}` : ""}
                  </p>
                </div>

                <ConfidenceDot confidence={item.overallConfidence} showLabel />

                {item.priority >= 5 ? <span className="pill pill-accent">Priority</span> : null}

                <Link
                  href={hrefFor(item.type, item.id, item.opportunityId)}
                  className="btn btn-secondary btn-sm"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}

function hrefFor(
  type: ReviewItemType,
  reviewId: string,
  opportunityId: string | null,
): string {
  if (type === "UPDATE") return `/admin/review/updates/${reviewId}`;
  return opportunityId ? `/admin/review/${opportunityId}` : "/admin/inbox";
}
