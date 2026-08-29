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

/**
 * One queue, not one per source.
 *
 * A record reaches a person the same way whether it came from the crawler,
 * source monitoring, pasted text, a submitted URL, manual entry, an import or
 * AI extraction — so they converge here. The row shows what kind of item it is;
 * the queue does not split into a tab each.
 */
const TO_REVIEW: Prisma.ReviewItemWhereInput = {
  status: { in: [...OPEN_STATUSES] },
};

const REJECTED: Prisma.ReviewItemWhereInput = { status: "REJECTED" };

/** What kind of review this row needs, shown per row rather than as its own
 *  queue. Error reports have their own screen and never appear here. */
const TYPE_LABEL: Partial<Record<ReviewItemType, string>> = {
  NEW_OPPORTUNITY: "New",
  UPDATE: "Update",
  POSSIBLE_DUPLICATE: "Possible duplicate",
  LOW_CONFIDENCE: "Low confidence",
  MISSING_INFORMATION: "Missing information",
  BROKEN_LINK: "Broken link",
  EXPIRED_OPPORTUNITY: "Expired",
};

const NOTICES: Record<string, string> = {
  drafted: "Saved as a draft. You'll find it under Opportunities → Drafts.",
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
  const showingRejected = params.tab === "rejected";
  const where = showingRejected ? REJECTED : TO_REVIEW;

  const [items, toReviewCount, rejectedCount] = await Promise.all([
    prisma.reviewItem.findMany({
      where,
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
    prisma.reviewItem.count({ where: TO_REVIEW }),
    prisma.reviewItem.count({ where: REJECTED }),
  ]);

  const notice = Object.keys(NOTICES).find((key) => params[key]);

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Everything waiting for a person, from every source. Nothing here is public, and nothing here publishes itself."
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

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Review queue">
            <Link
              href="/admin/review"
              aria-current={showingRejected ? undefined : "page"}
              className={cn(
                "inline-flex items-center gap-2 rounded-[7px] border px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-200",
                showingRejected
                  ? "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink"
                  : "border-ink bg-ink text-white",
              )}
            >
              To review
              <span
                className={cn(
                  "text-[12px] tabular-nums",
                  showingRejected ? "text-faint" : "text-accent",
                )}
              >
                {toReviewCount}
              </span>
            </Link>
          </nav>

          {/* Kept for history and audit, deliberately not an equal-weight tab. */}
          <Link
            href={showingRejected ? "/admin/review" : "/admin/review?tab=rejected"}
            className="text-[12.5px] text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {showingRejected
              ? "← Back to review"
              : `Rejected (${rejectedCount}) →`}
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="text-[16px] font-medium tracking-[-0.02em]">
              {showingRejected ? "No rejected opportunities" : "Nothing to review"}
            </p>
            <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-muted">
              {showingRejected
                ? "Rejected records are kept here for reference."
                : "New opportunities waiting for review will appear here."}
            </p>
            {showingRejected ? null : (
              <div className="mt-6 flex justify-center gap-2">
                <Link href="/admin/ingest/paste" className="btn btn-primary btn-sm">
                  Paste text
                </Link>
                <Link href="/admin/sources/new" className="btn btn-secondary btn-sm">
                  Add a source
                </Link>
              </div>
            )}
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
                    {TYPE_LABEL[item.type] ? `${TYPE_LABEL[item.type]} · ` : ""}
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
                  {showingRejected ? "Open" : "Review"}
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
