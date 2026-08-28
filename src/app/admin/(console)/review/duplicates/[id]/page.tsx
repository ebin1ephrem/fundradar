import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { WorkflowBadge } from "@/components/admin/status-badge";
import { formatDate, fundingRangeLabel } from "@/lib/utils";
import { resolveDuplicateAction } from "../../actions";

export const dynamic = "force-dynamic";

const RESOLUTIONS = [
  ["UPDATED_EXISTING", "Update the existing one", "Take what is new here into the record already live."],
  ["NEW_COHORT", "This is a new cohort", "A later edition of the same programme. Both stay."],
  ["KEPT_BOTH", "Keep both", "Genuinely different programmes."],
  ["MERGED", "Merge into the existing one", "Move the categories across and archive this draft."],
  ["KEPT_EXISTING", "Keep the existing one", "Reject this draft as a duplicate."],
] as const;

export default async function DuplicateReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const select = {
    id: true,
    slug: true,
    title: true,
    providerName: true,
    programmeName: true,
    shortDescription: true,
    fundingMin: true,
    fundingMax: true,
    currency: true,
    fundingAmountText: true,
    applicationDeadline: true,
    isRollingDeadline: true,
    applicationUrl: true,
    officialSourceUrl: true,
    eligibilitySummary: true,
    workflowStatus: true,
    publishedAt: true,
  } as const;

  const candidate = await prisma.duplicateCandidate.findUnique({
    where: { id },
    include: {
      opportunity: { select },
      existing: { select },
    },
  });

  if (!candidate) notFound();

  const signals = (candidate.signals ?? {}) as {
    signals?: { name: string; score: number; detail: string }[];
    looksLikeNewCohort?: boolean;
  };

  const rows: [string, string | null, string | null][] = [
    ["Title", candidate.existing.title, candidate.opportunity.title],
    ["Provider", candidate.existing.providerName, candidate.opportunity.providerName],
    ["Programme", candidate.existing.programmeName, candidate.opportunity.programmeName],
    [
      "Funding",
      fundingRangeLabel(
        candidate.existing.fundingMin?.toString() ?? null,
        candidate.existing.fundingMax?.toString() ?? null,
        candidate.existing.currency,
        candidate.existing.fundingAmountText,
      ),
      fundingRangeLabel(
        candidate.opportunity.fundingMin?.toString() ?? null,
        candidate.opportunity.fundingMax?.toString() ?? null,
        candidate.opportunity.currency,
        candidate.opportunity.fundingAmountText,
      ),
    ],
    [
      "Deadline",
      candidate.existing.isRollingDeadline
        ? "Rolling"
        : formatDate(candidate.existing.applicationDeadline),
      candidate.opportunity.isRollingDeadline
        ? "Rolling"
        : formatDate(candidate.opportunity.applicationDeadline),
    ],
    ["Application URL", candidate.existing.applicationUrl, candidate.opportunity.applicationUrl],
    ["Official source", candidate.existing.officialSourceUrl, candidate.opportunity.officialSourceUrl],
    ["Eligibility", candidate.existing.eligibilitySummary, candidate.opportunity.eligibilitySummary],
  ];

  return (
    <>
      <PageHeader
        title={`${Math.round(candidate.score * 100)}% possible duplicate`}
        breadcrumbs={[
          { label: "Review queue", href: "/admin/review?tab=duplicates" },
          { label: "Compare" },
        ]}
        description={
          signals.looksLikeNewCohort
            ? "The titles differ only by year. This is usually the next cohort of the same programme rather than a duplicate."
            : "Compare the two records and decide what should happen."
        }
      />

      <PageBody>
        <div className="card max-w-[1000px] overflow-hidden">
          <div className="grid grid-cols-2 gap-4 border-b border-line bg-subtle px-5 py-3">
            <div>
              <p className="eyebrow">Already in the database</p>
              <Link
                href={`/admin/opportunities/${candidate.existing.id}`}
                className="mt-1 block text-[14px] font-medium underline-offset-2 hover:underline"
              >
                {candidate.existing.title}
              </Link>
              <span className="mt-1.5 inline-block">
                <WorkflowBadge status={candidate.existing.workflowStatus} />
              </span>
            </div>
            <div>
              <p className="eyebrow">Newly collected</p>
              <Link
                href={`/admin/review/${candidate.opportunity.id}`}
                className="mt-1 block text-[14px] font-medium underline-offset-2 hover:underline"
              >
                {candidate.opportunity.title}
              </Link>
              <span className="mt-1.5 inline-block">
                <WorkflowBadge status={candidate.opportunity.workflowStatus} />
              </span>
            </div>
          </div>

          <ul className="divide-y divide-line">
            {rows.map(([label, left, right]) => {
              const same = (left ?? "") === (right ?? "");
              return (
                <li key={label} className="px-5 py-3">
                  <p className="mb-1.5 text-[11.5px] tracking-[0.06em] text-muted uppercase">
                    {label}
                    {!same ? <span className="ml-2 text-warn normal-case">differs</span> : null}
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-[13px]">
                    <p className="break-words">
                      {left || <span className="text-faint">Not set</span>}
                    </p>
                    <p className={same ? "break-words" : "break-words font-medium"}>
                      {right || <span className="text-faint">Not set</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {signals.signals?.length ? (
            <div className="border-t border-line px-5 py-3">
              <p className="text-[12px] text-muted">
                Matched on{" "}
                {signals.signals
                  .filter((s) => s.score > 0)
                  .map((s) => `${s.name.toLowerCase()} (${Math.round(s.score * 100)}%)`)
                  .join(", ")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 max-w-[1000px]">
          <h2 className="eyebrow mb-3">What should happen?</h2>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {RESOLUTIONS.map(([value, label, description]) => (
              <form key={value} action={resolveDuplicateAction}>
                <input type="hidden" name="duplicateId" value={candidate.id} />
                <input type="hidden" name="resolution" value={value} />
                <button
                  type="submit"
                  disabled={candidate.status !== "OPEN"}
                  className="h-full w-full rounded-[10px] border border-line bg-canvas p-4 text-left transition-[border-color,transform] duration-200 hover:-translate-y-[2px] hover:border-ink disabled:opacity-50"
                >
                  <span className="block text-[13.5px] font-medium">{label}</span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-muted">
                    {description}
                  </span>
                </button>
              </form>
            ))}
          </div>
          {candidate.status !== "OPEN" ? (
            <p className="hint mt-3">
              Already resolved as {candidate.status.replace(/_/g, " ").toLowerCase()} on{" "}
              {formatDate(candidate.resolvedAt)}.
            </p>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
