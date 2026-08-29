import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { WorkflowBadge } from "@/components/admin/status-badge";
import { FormError, FormNotice } from "@/components/ui/form";
import { pickerCategories } from "@/lib/queries/categories";
import { toFormValues } from "@/lib/admin/opportunity-form-values";
import { publishRequirements } from "@/lib/publishing";
import { FIELD_LABEL, type ExtractionField } from "@/lib/ai/schema";
import { formatDate } from "@/lib/utils";
import { OpportunityForm } from "../../opportunities/opportunity-form";
import { saveOpportunityAction } from "../../opportunities/actions";
import { saveAsDraftAction, saveReviewNotesAction } from "../actions";
import { admin as adminCopy } from "@/content/copy";
import { SourcePanel } from "./source-panel";
import {
  ExtractedFields,
  MissingPanel,
  RejectPanel,
  SuggestedCategories,
  type FieldRow,
} from "./panels";

export const dynamic = "force-dynamic";

export default async function ReviewOpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const flags = await searchParams;

  const [opportunity, categories] = await Promise.all([
    prisma.opportunity.findUnique({
      where: { id },
      include: {
        categories: { include: { category: { select: { categoryType: true } } } },
        source: { select: { id: true, name: true } },
        collectionItems: {
          orderBy: { discoveredAt: "desc" },
          take: 1,
          include: { createdBy: { select: { name: true } } },
        },
        extractionRuns: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: { fields: true },
        },
        categorySuggestions: {
          where: { status: "SUGGESTED" },
          include: { category: { select: { name: true, categoryType: true } } },
        },
        duplicatesFound: {
          where: { status: "OPEN" },
          include: {
            existing: { select: { id: true, title: true, slug: true, workflowStatus: true } },
          },
          orderBy: { score: "desc" },
        },
        reviewItems: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    pickerCategories(),
  ]);

  if (!opportunity) notFound();

  const run = opportunity.extractionRuns[0];
  const item = opportunity.collectionItems[0];
  const review = opportunity.reviewItems[0];

  const fieldRows: FieldRow[] = (run?.fields ?? []).map((field) => ({
    field: field.field,
    label: FIELD_LABEL[field.field as ExtractionField] ?? field.field,
    value: field.value,
    confidence: field.confidence,
    evidence: field.evidence,
    isUnknown: field.isUnknown,
  }));

  const missingRows = fieldRows.filter((r) => r.isUnknown);
  const selectedIds = opportunity.categories.map((c) => c.categoryId);
  const requirements = publishRequirements({
    ...opportunity,
    categoryTypes: opportunity.categories.map((c) => c.category.categoryType),
  });
  const blockers = requirements.filter((r) => r.blocking && !r.met);

  return (
    <>
      <PageHeader
        title={opportunity.title}
        breadcrumbs={[
          { label: "Review queue", href: "/admin/review" },
          { label: opportunity.title },
        ]}
        description={
          run
            ? `Read by ${run.provider}${run.model ? ` (${run.model})` : ""} on ${formatDate(run.startedAt)} · ${opportunity.ingestionMethod.replace(/_/g, " ").toLowerCase()}`
            : opportunity.ingestionMethod.replace(/_/g, " ").toLowerCase()
        }
        actions={<WorkflowBadge status={opportunity.workflowStatus} />}
      />

      <PageBody>
        {flags.error ? (
          <div className="mb-5">
            <FormError message={flags.error} />
          </div>
        ) : null}
        {flags.reextracted ? (
          <div className="mb-5">
            <FormNotice message="Re-read the source. Anything that changed is listed as a proposed update." />
          </div>
        ) : null}

        {opportunity.duplicatesFound.length ? (
          <div className="mb-6 rounded-[12px] border border-warn/30 bg-warn/5 p-5">
            <p className="flex items-center gap-2 text-[14px] font-medium text-warn">
              <AlertTriangle className="size-4" strokeWidth={2} />
              This may already be in the database
            </p>
            <ul className="mt-3 grid gap-2">
              {opportunity.duplicatesFound.map((duplicate) => {
                const signals = duplicate.signals as {
                  looksLikeNewCohort?: boolean;
                } | null;
                return (
                  <li
                    key={duplicate.id}
                    className="flex flex-wrap items-center gap-3 rounded-[8px] border border-line bg-canvas px-3.5 py-2.5"
                  >
                    <span className="pill pill-dark">
                      {Math.round(duplicate.score * 100)}% match
                    </span>
                    <Link
                      href={`/admin/opportunities/${duplicate.existing.id}`}
                      className="min-w-0 flex-1 truncate text-[13.5px] underline-offset-2 hover:underline"
                    >
                      {duplicate.existing.title}
                    </Link>
                    {signals?.looksLikeNewCohort ? (
                      <span className="pill">Looks like a later cohort</span>
                    ) : null}
                    <Link
                      href={`/admin/review/duplicates/${duplicate.id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Compare
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          {/* LEFT — what we read ------------------------------------------ */}
          <div className="grid h-fit gap-4 xl:sticky xl:top-6">
            <SourcePanel
              material={
                item
                  ? {
                      origin: item.origin,
                      url: item.url,
                      pageTitle: item.pageTitle,
                      rawText: item.rawText,
                      sourceName: item.sourceName,
                      createdBy: item.createdBy?.name ?? null,
                      discoveredAt: item.discoveredAt,
                      lastCheckedAt: item.lastCheckedAt,
                      sourceLabel: opportunity.source?.name ?? null,
                    }
                  : null
              }
            />

            {run?.classificationReason ? (
              <section className="card p-4">
                <h2 className="text-[13px] font-medium">
                  Read as {run.classification?.replace(/_/g, " ").toLowerCase()}
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                  {run.classificationReason}
                </p>
                {run.error ? (
                  <p className="mt-2 border-t border-line pt-2 text-[12px] text-warn">
                    {run.error}
                  </p>
                ) : null}
              </section>
            ) : null}

            <ExtractedFields rows={fieldRows} />
            <MissingPanel
              rows={missingRows}
              opportunityId={opportunity.id}
              sourceUrl={item?.url ?? opportunity.officialSourceUrl ?? null}
            />
          </div>

          {/* RIGHT — the draft an admin edits ----------------------------- */}
          <div className="grid gap-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_260px] lg:items-start">
              <SuggestedCategories
                suggestions={opportunity.categorySuggestions.map((suggestion) => ({
                  id: suggestion.id,
                  name: suggestion.category?.name ?? suggestion.suggestedName ?? "Unnamed",
                  type: suggestion.category?.categoryType ?? null,
                  confidence: suggestion.confidence,
                  reason: suggestion.reason,
                  isNew: !suggestion.categoryId,
                  alreadyOn: suggestion.categoryId
                    ? selectedIds.includes(suggestion.categoryId)
                    : false,
                }))}
              />

              <section className="card h-fit p-4">
                <h2 className="mb-1.5 text-[13px] font-medium">Decide</h2>
                <p className="text-[12px] leading-relaxed text-muted">
                  Keep it and it becomes a draft you can finish and publish.
                  Reject it and the same material will not come back.
                </p>

                <div className="mt-4 grid gap-2 border-t border-line pt-3.5">
                  <form action={saveAsDraftAction}>
                    <input type="hidden" name="opportunityId" value={opportunity.id} />
                    <button type="submit" className="btn btn-accent btn-sm w-full">
                      {adminCopy.actions.draft}
                    </button>
                  </form>
                  <RejectPanel opportunityId={opportunity.id} />
                </div>

                {/* Context only. Publishing happens on the draft page. */}
                {blockers.length ? (
                  <div className="mt-4 border-t border-line pt-3.5">
                    <p className="text-[12px] text-muted">
                      {blockers.length} field{blockers.length === 1 ? "" : "s"} still
                      needed before this can be published:
                    </p>
                    <ul className="mt-1.5 grid gap-1">
                      {blockers.map((requirement) => (
                        <li
                          key={requirement.key}
                          className="flex items-start gap-2 text-[12px] text-ink"
                        >
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-danger" />
                          {requirement.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {opportunity.officialSourceUrl ? (
                  <a
                    href={opportunity.officialSourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted underline-offset-2 hover:text-ink hover:underline"
                  >
                    <ExternalLink className="size-3" strokeWidth={1.7} />
                    Open the official source
                  </a>
                ) : null}
              </section>
            </div>

            {review ? (
              <form action={saveReviewNotesAction} className="card p-4">
                <input type="hidden" name="reviewItemId" value={review.id} />
                <label htmlFor="reviewNotes" className="text-[13px] font-medium">
                  Private review notes
                </label>
                <p className="hint mt-1">Internal only — never shown publicly.</p>
                <textarea
                  id="reviewNotes"
                  name="reviewNotes"
                  rows={2}
                  defaultValue={review.reviewNotes ?? ""}
                  className="field mt-2 text-[13px]"
                  placeholder="Funding amount is unclear — check the guideline PDF."
                />
                <button type="submit" className="btn btn-secondary btn-sm mt-2">
                  Save note
                </button>
              </form>
            ) : null}

            <div>
              <h2 className="eyebrow mb-3">The draft — edit anything</h2>
              <OpportunityForm
                allowPublish={false}
                action={saveOpportunityAction}
                opportunity={toFormValues(opportunity)}
                categories={categories}
                selectedCategoryIds={selectedIds}
                primaryCategoryId={
                  opportunity.categories.find((c) => c.isPrimary)?.categoryId ?? null
                }
              />
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}
