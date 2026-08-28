import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireLead, savedOpportunityIds } from "@/lib/leads/identity";
import { search } from "@/lib/search";
import { recommendedFor } from "@/lib/queries/recommendations";
import { computeLeadScore, MAX_SCORE } from "@/lib/leads/scoring";
import { OpportunityCard } from "@/components/public/opportunity-card";
import { CLOSING_SOON_DAYS } from "@/lib/opportunity-status";
import { dashboard as dash, home } from "@/content/copy";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const lead = await requireLead();

  const [recommended, savedIds, saved, interests, breakdown] = await Promise.all([
    recommendedFor(lead.id),
    savedOpportunityIds(),
    prisma.savedOpportunity.findMany({
      where: { leadId: lead.id, status: { in: ["SAVED", "INTERESTED", "APPLIED"] } },
      include: { opportunity: { select: { id: true, applicationDeadline: true } } },
    }),
    prisma.leadCategoryInterest.findMany({
      where: { leadId: lead.id },
      orderBy: { weight: "desc" },
      take: 8,
      include: { category: { select: { name: true, slug: true } } },
    }),
    computeLeadScore(lead.id),
  ]);

  const closingCutoff = new Date(Date.now() + CLOSING_SOON_DAYS * 4 * 86_400_000);
  const savedClosingSoon = saved.filter(
    (row) =>
      row.opportunity.applicationDeadline &&
      row.opportunity.applicationDeadline >= new Date() &&
      row.opportunity.applicationDeadline <= closingCutoff,
  );

  // Fetch extra and drop anything already shown above — repeating the same
  // three cards under a different heading is noise, not a second section.
  const newestPool = await search.search({ sort: "newest", perPage: 12 });
  const shown = new Set(recommended.hits.map((h) => h.id));
  const newest = newestPool.hits.filter((h) => !shown.has(h.id)).slice(0, 3);

  return (
    <div className="grid gap-12">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Saved" value={saved.length} href="/dashboard/saved" />
        <Tile
          label={dash.sections.closing}
          value={savedClosingSoon.length}
          hint="Of the ones you saved"
          accent={savedClosingSoon.length > 0}
        />
        <Tile
          label="Profile"
          value={`${lead.profileCompletion}%`}
          hint="Better profile, better matches"
          href="/dashboard/profile"
        />
        <Tile
          label="Engagement"
          value={`${breakdown?.score ?? lead.leadScore}/${MAX_SCORE}`}
          hint="Rises as you tell us more"
        />
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="display-md">{dash.sections.signal}</h2>
            <p className="mt-1.5 text-[14px] text-muted">
              {recommended.basis.length
                ? `Based on your interest in ${recommended.basis.join(", ")}.`
                : "Newest first while we learn what you are looking for."}
            </p>
          </div>
          <Link
            href="/opportunities"
            className="text-[14px] text-muted underline underline-offset-2 hover:text-ink"
          >
            {home.open.cta}
          </Link>
        </div>

        {recommended.hits.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recommended.hits.map((hit) => (
              <OpportunityCard key={hit.id} hit={hit} saved={savedIds.has(hit.id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-[12px] border border-dashed border-line-strong px-6 py-12 text-center">
            <p className="text-[15px] font-medium tracking-[-0.02em]">
              {dash.empty.recommendations.headline}
            </p>
            <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-muted">
              {dash.empty.recommendations.body}
            </p>
            <Link href="/dashboard/profile" className="btn btn-secondary mt-5">
              {dash.empty.recommendations.cta}
            </Link>
          </div>
        )}
      </section>

      {interests.length ? (
        <section>
          <h2 className="display-md">{dash.sections.categories}</h2>
          <p className="mt-1.5 text-[14px] text-muted">
            Built from what you have been looking at. Change what you hear about
            in{" "}
            <Link href="/dashboard/alerts" className="underline underline-offset-2">
              alerts
            </Link>
            .
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {interests.map((interest) => (
              <Link
                key={interest.id}
                href={`/categories/${interest.category.slug}`}
                className="pill transition-colors duration-200 hover:border-ink hover:text-ink"
              >
                {interest.category.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {newest.length ? (
        <section>
          <h2 className="display-md">{dash.sections.new}</h2>
          <p className="mt-1.5 mb-5 text-[14px] text-muted">
            {dash.sections.newHint}.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {newest.map((hit) => (
              <OpportunityCard key={hit.id} hit={hit} saved={savedIds.has(hit.id)} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  href,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <>
      <p className="text-[11.5px] font-semibold tracking-[0.07em] text-muted uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-[30px] leading-none font-medium tracking-[-0.035em] tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[12.5px] text-muted">{hint}</p> : null}
      {accent ? <span className="mt-3 block h-[3px] w-9 rounded-full bg-accent" /> : null}
    </>
  );

  const className =
    "block rounded-[12px] border border-line bg-canvas p-5 transition-colors duration-200";

  return href ? (
    <Link href={href} className={`${className} hover:border-line-strong`}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}
