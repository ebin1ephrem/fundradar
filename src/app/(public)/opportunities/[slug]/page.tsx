import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, ExternalLink, MapPin, Share2 } from "lucide-react";
import {
  getPublishedOpportunity,
  similarOpportunities,
} from "@/lib/queries/opportunity-detail";
import { LIFECYCLE_LABEL, deadlineLabel, lifecycleStatus } from "@/lib/opportunity-status";
import { formatDate, fundingRangeLabel, NOT_SPECIFIED } from "@/lib/utils";
import { BENEFIT_FIELDS, FUNDING_TYPE_LABEL, GEOGRAPHY_SCOPE_LABEL } from "@/lib/validation/opportunity";
import { DetailSection, FactRow } from "@/components/public/detail-section";
import { ProviderText } from "@/components/public/prose";
import { OpportunityCard } from "@/components/public/opportunity-card";
import {
  ApplyLink,
  LockedSection,
  ReminderButton,
  SaveButton,
} from "@/components/lead/unlock";
import { LeadGateSubject } from "@/components/lead/gate-context";
import { TrackView } from "@/components/lead/tracker";
import { getViewer } from "@/lib/leads/identity";
import { resolveGate } from "@/lib/gating";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

// Deliberately dynamic: a cached page showing "3 days left" when the deadline
// has passed is exactly the failure that loses a funding directory its users.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const opportunity = await getPublishedOpportunity(slug);
  if (!opportunity) return { title: "Opportunity not found" };

  const title = opportunity.seoTitle ?? `${opportunity.title} — ${opportunity.providerName}`;
  const description = opportunity.seoDescription ?? opportunity.shortDescription;

  return {
    title,
    description,
    alternates: { canonical: `/opportunities/${opportunity.slug}` },
    openGraph: { title, description, type: "article" },
  };
}

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const opportunity = await getPublishedOpportunity(slug);
  if (!opportunity) notFound();

  const { lead } = await getViewer();
  const gate = await resolveGate(Boolean(lead));
  const similar = gate.isLocked("relatedOpportunities")
    ? []
    : await similarOpportunities(opportunity);

  const saved = lead
    ? await prisma.savedOpportunity.findUnique({
        where: {
          leadId_opportunityId: { leadId: lead.id, opportunityId: opportunity.id },
        },
        select: { id: true },
      })
    : null;

  const status = lifecycleStatus(opportunity);
  const isClosed = status === "CLOSED";
  const byType = (type: string) =>
    opportunity.categories.filter((c) => c.category.categoryType === type);

  const stages = byType("STARTUP_STAGE");
  const industries = byType("INDUSTRY");
  const founderTypes = byType("FOUNDER_TYPE");
  const opportunityTypes = byType("OPPORTUNITY_TYPE");

  const benefits = BENEFIT_FIELDS.filter(
    (b) => opportunity[b.name] as boolean,
  );

  const location =
    opportunity.geographyScope === "INTERNATIONAL"
      ? (opportunity.country ?? "International")
      : [opportunity.city, opportunity.state, opportunity.country]
          .filter(Boolean)
          .join(", ") || "Pan India";

  const eligibilityFlags = [
    { label: "DPIIT recognition", value: opportunity.requiresDpiit },
    { label: "MSME / Udyam registration", value: opportunity.requiresMsmeUdyam },
    { label: "Student founder", value: opportunity.requiresStudentFounder },
    { label: "Women founder", value: opportunity.requiresWomenFounder },
  ].filter((f) => f.value !== null);

  return (
    <>
      <LeadGateSubject
        subject={{
          kind: "opportunity",
          label: opportunityTypes[0]?.category.name,
          opportunityId: opportunity.id,
          categoryIds: opportunity.categories.map((c) => c.categoryId),
        }}
      />
      <TrackView
        type="opportunity_view"
        opportunityId={opportunity.id}
        categoryIds={opportunity.categories.map((c) => c.categoryId)}
      />

      <div className="border-b border-line bg-subtle">
        <div className="page-shell py-9 lg:py-12">
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
              <li>
                <Link href="/" className="hover:text-ink">Home</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/opportunities" className="hover:text-ink">Opportunities</Link>
              </li>
              {opportunityTypes[0] ? (
                <>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link
                      href={`/categories/${opportunityTypes[0].category.slug}`}
                      className="hover:text-ink"
                    >
                      {opportunityTypes[0].category.name}
                    </Link>
                  </li>
                </>
              ) : null}
            </ol>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "pill",
                    status === "CLOSING_SOON" && "pill-accent",
                    status === "OPEN" && "border-ok/30 bg-ok/5 text-ok",
                    isClosed && "text-faint",
                  )}
                >
                  {LIFECYCLE_LABEL[status]}
                </span>
                {opportunity.isEquityFree ? <span className="pill">Equity-free</span> : null}
                {opportunity.fundingTypes.slice(0, 3).map((type) => (
                  <span key={type} className="pill">
                    {FUNDING_TYPE_LABEL[type]}
                  </span>
                ))}
              </div>

              <h1 className="display-md max-w-[22ch]">{opportunity.title}</h1>
              <p className="mt-3 text-[16px] text-muted">
                {opportunity.providerName}
                {opportunity.programmeName ? ` · ${opportunity.programmeName}` : ""}
              </p>
              <p className="lede mt-5 max-w-[62ch]">{opportunity.shortDescription}</p>

              <div className="mt-6 flex flex-wrap items-center gap-1.5">
                {opportunity.categories.slice(0, 8).map((link) => (
                  <Link
                    key={link.category.slug}
                    href={`/categories/${link.category.slug}`}
                    className="pill transition-colors duration-200 hover:border-ink hover:text-ink"
                  >
                    {link.category.name}
                  </Link>
                ))}
              </div>
            </div>

            <aside className="lg:sticky lg:top-[92px] lg:h-fit">
              <div className="rounded-[12px] border border-line bg-canvas p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                <dl>
                  <FactRow
                    label="Funding"
                    value={fundingRangeLabel(
                      opportunity.fundingMin?.toString() ?? null,
                      opportunity.fundingMax?.toString() ?? null,
                      opportunity.currency,
                      opportunity.fundingAmountText,
                    )}
                  />
                  <FactRow
                    label="Deadline"
                    value={
                      opportunity.isRollingDeadline
                        ? "Rolling"
                        : formatDate(opportunity.applicationDeadline)
                    }
                  />
                  <FactRow
                    label="Time left"
                    value={deadlineLabel(
                      opportunity.applicationDeadline,
                      opportunity.isRollingDeadline,
                    )}
                  />
                  <FactRow
                    label="Location"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-faint" strokeWidth={1.7} />
                        {location}
                      </span>
                    }
                  />
                  {stages.length ? (
                    <FactRow
                      label="Stage"
                      value={stages.map((s) => s.category.name).join(", ")}
                    />
                  ) : null}
                </dl>

                <div className="mt-5 grid gap-2">
                  {opportunity.applicationUrl && !gate.isLocked("applicationUrl") ? (
                    <ApplyLink
                      opportunityId={opportunity.id}
                      href={opportunity.applicationUrl}
                    >
                      Apply officially
                      <ArrowUpRight className="size-4" strokeWidth={1.8} />
                    </ApplyLink>
                  ) : null}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <ReminderButton opportunityId={opportunity.id} />
                    <SaveButton
                      opportunityId={opportunity.id}
                      title={opportunity.title}
                      saved={Boolean(saved)}
                    />
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `${opportunity.title} — ${opportunity.providerName}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label="Share this opportunity"
                      className="grid size-8 place-items-center self-center rounded-[6px] border border-line text-faint transition-colors duration-200 hover:border-line-strong hover:text-ink"
                    >
                      <Share2 className="size-4" strokeWidth={1.6} />
                    </a>
                  </div>
                </div>

                <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
                  Applications are made on the provider&apos;s own site. FundRadar
                  never charges for an application.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div className="page-shell py-10 lg:py-14">
        <div className="grid max-w-[760px] gap-8">
          {gate.isLocked("fullDescription") ? (
            <LockedSection
              title="Overview"
              teaser="Read the full programme description"
              reason="view_full_details"
            />
          ) : opportunity.fullDescription ? (
            <DetailSection id="overview" title="Overview">
              <ProviderText text={opportunity.fullDescription} />
            </DetailSection>
          ) : null}

          <DetailSection id="funding" title="Funding">
            <dl className="rounded-[12px] border border-line px-5 py-1">
              <FactRow
                label="Amount"
                value={fundingRangeLabel(
                  opportunity.fundingMin?.toString() ?? null,
                  opportunity.fundingMax?.toString() ?? null,
                  opportunity.currency,
                  opportunity.fundingAmountText,
                )}
              />
              <FactRow label="Currency" value={opportunity.currency} />
              <FactRow
                label="Equity taken"
                value={
                  opportunity.isEquityFree === null
                    ? NOT_SPECIFIED
                    : opportunity.isEquityFree
                      ? "No — equity-free"
                      : "Yes"
                }
              />
              {opportunity.fundingTypes.length ? (
                <FactRow
                  label="Funding type"
                  value={opportunity.fundingTypes
                    .map((t) => FUNDING_TYPE_LABEL[t])
                    .join(", ")}
                />
              ) : null}
            </dl>
          </DetailSection>

          {gate.isLocked("eligibility") ? (
            <LockedSection
              title="Eligibility"
              teaser="See the full eligibility criteria"
              reason="view_eligibility"
            />
          ) : (
          <DetailSection id="eligibility" title="Eligibility">
            <ProviderText text={opportunity.eligibilitySummary} />
            {eligibilityFlags.length ? (
              <ul className="mt-5 grid gap-1.5 sm:grid-cols-2">
                {eligibilityFlags.map((flag) => (
                  <li
                    key={flag.label}
                    className="flex items-center gap-2 rounded-[8px] border border-line px-3 py-2 text-[13.5px]"
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-full",
                        flag.value ? "bg-accent text-ink" : "bg-subtle text-faint",
                      )}
                    >
                      {flag.value ? <Check className="size-2.5" strokeWidth={3} /> : "–"}
                    </span>
                    {flag.label} {flag.value ? "required" : "not required"}
                  </li>
                ))}
              </ul>
            ) : null}
            {opportunity.otherEligibility ? (
              <div className="mt-5">
                <ProviderText text={opportunity.otherEligibility} />
              </div>
            ) : null}
          </DetailSection>
          )}

          <DetailSection id="who-can-apply" title="Who can apply">
            <dl className="rounded-[12px] border border-line px-5 py-1">
              <FactRow label="Geographic scope" value={GEOGRAPHY_SCOPE_LABEL[opportunity.geographyScope]} />
              <FactRow
                label="Startup stage"
                value={stages.length ? stages.map((s) => s.category.name).join(", ") : NOT_SPECIFIED}
              />
              <FactRow
                label="Industry focus"
                value={industries.length ? industries.map((s) => s.category.name).join(", ") : "Sector agnostic"}
              />
              {founderTypes.length ? (
                <FactRow
                  label="Founder focus"
                  value={founderTypes.map((s) => s.category.name).join(", ")}
                />
              ) : null}
              <FactRow
                label="Company age"
                value={
                  opportunity.incorporationAgeMaxMonths
                    ? `Up to ${Math.round(opportunity.incorporationAgeMaxMonths / 12)} years`
                    : NOT_SPECIFIED
                }
              />
            </dl>
            {opportunity.founderRequirements ? (
              <div className="mt-5">
                <ProviderText text={opportunity.founderRequirements} />
              </div>
            ) : null}
          </DetailSection>

          {gate.isLocked("benefits") ? (
            <LockedSection
              title="Benefits"
              teaser="See everything the programme offers"
              reason="view_benefits"
            />
          ) : benefits.length || opportunity.benefitsSummary ? (
            <DetailSection id="benefits" title="Benefits">
              <ProviderText text={opportunity.benefitsSummary} />
              {benefits.length ? (
                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {benefits.map((benefit) => (
                    <li key={benefit.name} className="pill">
                      <Check className="size-3 text-ink" strokeWidth={2.4} />
                      {benefit.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </DetailSection>
          ) : null}

          {gate.isLocked("applicationProcess") ? (
            <LockedSection
              title="Application process"
              teaser="See how to apply, step by step"
              reason="view_application_details"
            />
          ) : opportunity.applicationProcess || opportunity.applicationInstructions ? (
            <DetailSection id="application-process" title="Application process">
              <ProviderText
                text={opportunity.applicationProcess ?? opportunity.applicationInstructions}
              />
            </DetailSection>
          ) : null}

          {gate.isLocked("requiredDocuments") ? (
            <LockedSection
              title="Required documents"
              teaser="See what you need to prepare"
              reason="view_documents"
            />
          ) : opportunity.requiredDocuments ? (
            <DetailSection id="required-documents" title="Required documents">
              <ProviderText text={opportunity.requiredDocuments} />
            </DetailSection>
          ) : null}

          {gate.isLocked("selectionProcess") ? null : opportunity.selectionProcess ? (
            <DetailSection id="selection-process" title="Selection process">
              <ProviderText text={opportunity.selectionProcess} />
            </DetailSection>
          ) : null}

          <DetailSection id="important-dates" title="Important dates">
            <dl className="rounded-[12px] border border-line px-5 py-1">
              <FactRow
                label="Applications open"
                value={
                  opportunity.applicationOpenDate
                    ? formatDate(opportunity.applicationOpenDate)
                    : NOT_SPECIFIED
                }
              />
              <FactRow
                label="Application deadline"
                value={
                  opportunity.isRollingDeadline
                    ? "Rolling — no fixed deadline"
                    : formatDate(opportunity.applicationDeadline)
                }
              />
              {opportunity.programmeStartDate ? (
                <FactRow label="Programme starts" value={formatDate(opportunity.programmeStartDate)} />
              ) : null}
              {opportunity.programmeEndDate ? (
                <FactRow label="Programme ends" value={formatDate(opportunity.programmeEndDate)} />
              ) : null}
            </dl>
          </DetailSection>

          {gate.isLocked("importantNotes") ? null : opportunity.importantNotes ? (
            <DetailSection id="notes" title="Important notes">
              <ProviderText text={opportunity.importantNotes} />
            </DetailSection>
          ) : null}

          <DetailSection id="source" title="Official source">
            <div className="rounded-[12px] border border-line p-5">
              <a
                href={opportunity.officialSourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-start gap-2 text-[14.5px] break-all underline underline-offset-2 hover:text-ink"
              >
                <ExternalLink className="mt-1 size-3.5 shrink-0 text-faint" strokeWidth={1.7} />
                {opportunity.officialSourceUrl}
              </a>
              <dl className="mt-4 border-t border-line pt-1">
                <FactRow label="Last verified" value={formatDate(opportunity.lastVerifiedAt)} />
                <FactRow label="Last checked" value={formatDate(opportunity.lastCheckedAt)} />
                <FactRow label="Last updated" value={formatDate(opportunity.updatedAt)} />
              </dl>
              <p className="mt-4 text-[13px] leading-relaxed text-muted">
                Checked by our team against the provider&apos;s own page. Deadlines
                and terms can change without notice — always confirm on the
                official source before applying.
              </p>
              {opportunity.contactEmail ? (
                <p className="mt-2 text-[13px] text-muted">
                  Programme contact:{" "}
                  <a
                    href={`mailto:${opportunity.contactEmail}`}
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    {opportunity.contactEmail}
                  </a>
                </p>
              ) : null}
            </div>
          </DetailSection>
        </div>

        {similar.length ? (
          <section className="mt-14 border-t border-line pt-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h2 className="display-md">Similar opportunities</h2>
              <Link
                href={`/opportunities${
                  opportunityTypes[0] ? `?c=${opportunityTypes[0].category.slug}` : ""
                }`}
                className="text-[14px] text-muted underline underline-offset-2 hover:text-ink"
              >
                See more like this
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {similar.map((hit) => (
                <OpportunityCard key={hit.id} hit={hit} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
