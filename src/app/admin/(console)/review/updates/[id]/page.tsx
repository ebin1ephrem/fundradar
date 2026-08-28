import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { FormError } from "@/components/ui/form";
import { ConfidenceDot } from "@/components/admin/confidence";
import { formatDate } from "@/lib/utils";
import type { DetectedChange } from "@/lib/ingestion/changes";
import { approveUpdateAction, rejectUpdateAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function UpdateReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;

  const review = await prisma.reviewItem.findUnique({
    where: { id },
    include: {
      opportunity: {
        select: {
          id: true,
          slug: true,
          title: true,
          providerName: true,
          officialSourceUrl: true,
          currentVersion: true,
          lastVerifiedAt: true,
        },
      },
      collectionItem: { select: { url: true, lastCheckedAt: true, origin: true } },
    },
  });

  if (!review || review.type !== "UPDATE" || !review.opportunity) notFound();

  const changes = (review.proposedChanges ?? []) as unknown as DetectedChange[];
  const resolved = review.status === "APPROVED" || review.status === "REJECTED";

  return (
    <>
      <PageHeader
        title="Detected changes"
        breadcrumbs={[
          { label: "Review queue", href: "/admin/review?tab=updates" },
          { label: review.opportunity.title },
        ]}
        description={`${review.opportunity.title} · ${review.opportunity.providerName}`}
        actions={
          <Link
            href={`/opportunities/${review.opportunity.slug}`}
            target="_blank"
            className="btn btn-secondary btn-sm"
          >
            View the live page
          </Link>
        }
      />

      <PageBody>
        {flags.error ? (
          <div className="mb-5">
            <FormError message={flags.error} />
          </div>
        ) : null}

        <p className="mb-5 max-w-[74ch] rounded-[10px] border border-line bg-subtle px-4 py-3 text-[13.5px] text-muted">
          The public page still shows the approved information. Nothing changes
          there until you approve it here — version {review.opportunity.currentVersion} stays
          live, and the previous values are kept whatever you decide.
        </p>

        {resolved ? (
          <p className="mb-5 text-[13.5px] text-muted">
            This was already {review.status.toLowerCase()} on {formatDate(review.resolvedAt)}.
          </p>
        ) : null}

        <form action={approveUpdateAction} className="max-w-[900px]">
          <input type="hidden" name="reviewItemId" value={review.id} />

          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 border-b border-line bg-subtle px-5 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
              <span>Currently approved</span>
              <span aria-hidden="true" />
              <span>Newly detected</span>
            </div>

            <ul className="divide-y divide-line">
              {changes.map((change) => (
                <li key={change.field} className="px-5 py-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="fields"
                      value={change.field}
                      defaultChecked={!resolved}
                      disabled={resolved}
                      className="mt-1 size-4 shrink-0 accent-ink"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium">{change.label}</span>
                        <ConfidenceDot confidence={change.confidence} showLabel />
                      </span>

                      <span className="mt-2 grid grid-cols-[1fr_auto_1fr] items-start gap-4">
                        <span className="rounded-[8px] border border-line px-3 py-2 text-[13px] break-words">
                          {change.current ?? (
                            <span className="text-faint">Not set</span>
                          )}
                        </span>
                        <ArrowRight
                          className="mt-2.5 size-4 shrink-0 text-faint"
                          strokeWidth={1.7}
                        />
                        <span className="rounded-[8px] border border-ink bg-accent/10 px-3 py-2 text-[13px] break-words">
                          {change.detected}
                        </span>
                      </span>

                      {change.evidence ? (
                        <span className="mt-2 block border-l-2 border-line pl-2.5 text-[12px] leading-relaxed text-faint italic">
                          “{change.evidence}”
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
              {!resolved ? (
                <>
                  <button type="submit" className="btn btn-accent btn-sm">
                    Approve the ticked changes
                  </button>
                  <button
                    type="submit"
                    formAction={rejectUpdateAction}
                    className="btn btn-secondary btn-sm"
                  >
                    Reject all
                  </button>
                </>
              ) : null}
              <a
                href={review.collectionItem?.url ?? review.opportunity.officialSourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[13px] text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                <ExternalLink className="size-3.5" strokeWidth={1.7} />
                Open the source
              </a>
              <p className="hint ml-auto">
                Detected {formatDate(review.createdAt)}
                {review.collectionItem?.lastCheckedAt
                  ? ` · last checked ${formatDate(review.collectionItem.lastCheckedAt)}`
                  : ""}
              </p>
            </div>
          </div>
        </form>
      </PageBody>
    </>
  );
}
