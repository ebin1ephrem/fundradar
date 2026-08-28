import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { WorkflowBadge, LifecycleBadge } from "@/components/admin/status-badge";
import { FormError, FormNotice } from "@/components/ui/form";
import { pickerCategories } from "@/lib/queries/categories";
import { toFormValues } from "@/lib/admin/opportunity-form-values";
import { publishRequirements } from "@/lib/publishing";
import { lifecycleStatus } from "@/lib/opportunity-status";
import { cn, formatDate } from "@/lib/utils";
import { OpportunityForm } from "../opportunity-form";
import { saveOpportunityAction, setOpportunityStatusAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditOpportunityPage({
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
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 6,
          include: { createdBy: { select: { name: true } } },
        },
        source: { select: { id: true, name: true } },
      },
    }),
    pickerCategories(),
  ]);

  if (!opportunity) notFound();

  const selectedIds = opportunity.categories.map((c) => c.categoryId);
  const primaryId =
    opportunity.categories.find((c) => c.isPrimary)?.categoryId ?? null;
  const requirements = publishRequirements({
    ...opportunity,
    categoryTypes: opportunity.categories.map((c) => c.category.categoryType),
  });
  const blockers = requirements.filter((r) => r.blocking && !r.met);
  const isPublished = opportunity.workflowStatus === "PUBLISHED";

  return (
    <>
      <PageHeader
        title={opportunity.title}
        breadcrumbs={[
          { label: "Opportunities", href: "/admin/opportunities" },
          { label: opportunity.title },
        ]}
        description={`${opportunity.providerName} · version ${opportunity.currentVersion}`}
        actions={
          <>
            <WorkflowBadge status={opportunity.workflowStatus} />
            <LifecycleBadge status={lifecycleStatus(opportunity)} />
            {isPublished ? (
              <Link
                href={`/opportunities/${opportunity.slug}`}
                target="_blank"
                className="btn btn-secondary btn-sm"
              >
                View public page
              </Link>
            ) : null}
          </>
        }
      />

      <PageBody>
        {flags.error ? (
          <div className="mb-5">
            <FormError message={flags.error} />
          </div>
        ) : null}
        {flags.saved || flags.published || flags.statusChanged ? (
          <div className="mb-5">
            <FormNotice
              message={
                flags.published
                  ? "Published. It is now searchable and listed on its category pages."
                  : flags.statusChanged
                    ? "Status updated."
                    : "Changes saved."
              }
            />
          </div>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[1fr_300px]">
          <OpportunityForm
            action={saveOpportunityAction}
            opportunity={toFormValues(opportunity)}
            categories={categories}
            selectedCategoryIds={selectedIds}
            primaryCategoryId={primaryId}
          />

          <aside className="grid h-fit gap-4 xl:sticky xl:top-6">
            <section className="card p-4">
              <h2 className="mb-3 text-[13px] font-medium">Publication checklist</h2>
              <ul className="grid gap-1.5">
                {requirements.map((req) => (
                  <li key={req.key} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                        req.met
                          ? "bg-accent text-ink"
                          : req.blocking
                            ? "bg-danger/10 text-danger"
                            : "bg-subtle text-faint",
                      )}
                    >
                      {req.met ? (
                        <Check className="size-2.5" strokeWidth={3} />
                      ) : (
                        <X className="size-2.5" strokeWidth={3} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-[12.5px] leading-snug",
                          req.met ? "text-muted" : "text-ink",
                        )}
                      >
                        {req.label}
                        {!req.blocking ? (
                          <span className="text-faint"> · advisory</span>
                        ) : null}
                      </span>
                      {!req.met && req.detail ? (
                        <span className="mt-0.5 block text-[11.5px] text-faint">
                          {req.detail}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-line pt-3 text-[12px] text-muted">
                {blockers.length === 0
                  ? "Ready to publish."
                  : `${blockers.length} requirement${blockers.length === 1 ? "" : "s"} outstanding.`}
              </p>
            </section>

            <section className="card p-4">
              <h2 className="mb-3 text-[13px] font-medium">Status</h2>
              <div className="grid gap-2">
                {isPublished ? (
                  <StatusButton id={opportunity.id} status="DRAFT" label="Unpublish to draft" />
                ) : (
                  <StatusButton
                    id={opportunity.id}
                    status="PUBLISHED"
                    label="Approve & publish"
                    variant="accent"
                    disabled={blockers.length > 0}
                  />
                )}
                {opportunity.workflowStatus !== "ARCHIVED" ? (
                  <StatusButton id={opportunity.id} status="ARCHIVED" label="Archive" variant="secondary" />
                ) : (
                  <StatusButton id={opportunity.id} status="DRAFT" label="Restore to draft" variant="secondary" />
                )}
              </div>
              <dl className="mt-4 grid gap-1.5 border-t border-line pt-3 text-[12px]">
                <Meta label="Published" value={opportunity.publishedAt ? formatDate(opportunity.publishedAt) : "Never"} />
                <Meta label="Last checked" value={formatDate(opportunity.lastCheckedAt)} />
                <Meta label="Last verified" value={formatDate(opportunity.lastVerifiedAt)} />
                <Meta label="Views" value={String(opportunity.viewCount)} />
                <Meta label="Saves" value={String(opportunity.saveCount)} />
              </dl>
            </section>

            <section className="card p-4">
              <h2 className="mb-2 text-[13px] font-medium">Source</h2>
              <a
                href={opportunity.officialSourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-start gap-1.5 text-[12.5px] break-all text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                <ExternalLink className="mt-0.5 size-3 shrink-0" strokeWidth={1.6} />
                {opportunity.officialSourceUrl}
              </a>
              {opportunity.source ? (
                <p className="mt-2 text-[12px] text-muted">
                  Monitored source: {opportunity.source.name}
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-muted">Entered manually.</p>
              )}
            </section>

            <section className="card p-4">
              <h2 className="mb-2 text-[13px] font-medium">Version history</h2>
              {opportunity.versions.length === 0 ? (
                <p className="text-[12px] text-muted">No versions recorded yet.</p>
              ) : (
                <ol className="grid gap-2.5">
                  {opportunity.versions.map((version) => (
                    <li key={version.id} className="border-l border-line pl-3">
                      <p className="text-[12.5px]">
                        v{version.versionNumber} · {version.changeSummary ?? "Updated"}
                      </p>
                      <p className="text-[11.5px] text-faint">
                        {formatDate(version.createdAt)}
                        {version.createdBy ? ` · ${version.createdBy.name}` : ""}
                      </p>
                      {version.changedFields.length ? (
                        <p className="mt-0.5 text-[11px] text-faint">
                          {version.changedFields.slice(0, 4).join(", ")}
                          {version.changedFields.length > 4
                            ? ` +${version.changedFields.length - 4}`
                            : ""}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function StatusButton({
  id,
  status,
  label,
  variant = "primary",
  disabled,
}: {
  id: string;
  status: string;
  label: string;
  variant?: "primary" | "accent" | "secondary";
  disabled?: boolean;
}) {
  return (
    <form action={setOpportunityStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={disabled}
        className={cn("btn btn-sm w-full", `btn-${variant}`)}
      >
        {label}
      </button>
    </form>
  );
}
