import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { SearchHit } from "@/lib/search";
import { cn, daysUntil, formatDate, fundingRangeLabel } from "@/lib/utils";
import { CLOSING_SOON_DAYS, lifecycleStatus } from "@/lib/opportunity-status";
import { SaveButton } from "@/components/lead/unlock";
import { opportunity as oppCopy } from "@/content/copy";

const NEW_FOR_DAYS = 14;

export function OpportunityCard({
  hit,
  saved,
}: {
  hit: SearchHit;
  saved?: boolean;
}) {
  const status = lifecycleStatus({
    applicationDeadline: hit.applicationDeadline,
    applicationOpenDate: hit.applicationOpenDate,
    isRollingDeadline: hit.isRollingDeadline,
    lifecycleOverride: hit.lifecycleOverride as never,
  });

  const daysLeft = hit.isRollingDeadline ? null : daysUntil(hit.applicationDeadline);
  const publishedDaysAgo = hit.publishedAt ? -1 * (daysUntil(hit.publishedAt) ?? 0) : null;
  const isNew = publishedDaysAgo !== null && publishedDaysAgo <= NEW_FOR_DAYS;
  const isClosingSoon = status === "CLOSING_SOON";
  const isClosed = status === "CLOSED";

  const location =
    hit.geographyScope === "INTERNATIONAL"
      ? (hit.country ?? "International")
      : hit.geographyScope === "REMOTE"
        ? "Remote"
        : (hit.state ?? hit.country ?? "Pan India");

  // Opportunity type first, then the rest — the type is what a founder scans for.
  const shownCategories = [...hit.categories]
    .filter((category) => !category.slug.toLowerCase().includes("subsid"))
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      const rank = (t: string) => (t === "OPPORTUNITY_TYPE" ? 0 : t === "INDUSTRY" ? 1 : 2);
      return rank(a.categoryType) - rank(b.categoryType);
    })
    .slice(0, 3);

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-[12px] border border-line bg-canvas p-5 transition-[border-color,transform] duration-200 hover:-translate-y-[2px] hover:border-line-strong",
        isClosed && "opacity-70",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {isClosingSoon ? (
            <span className="pill pill-accent">
              {daysLeft === 0 ? "Closes today" : `${daysLeft}d left`}
            </span>
          ) : null}
          {isNew && !isClosingSoon ? <span className="pill pill-dark">New</span> : null}
          {isClosed ? <span className="pill text-faint">Closed</span> : null}
          {hit.isRollingDeadline ? <span className="pill">Rolling</span> : null}
          {hit.isEquityFree ? <span className="pill">Equity-free</span> : null}
        </div>
        <SaveButton opportunityId={hit.id} title={hit.title} saved={saved} />
      </div>

      <h3 className="text-[17px] leading-[1.25] font-medium tracking-[-0.02em]">
        <Link href={`/opportunities/${hit.slug}`} className="before:absolute before:inset-0">
          {hit.title}
        </Link>
      </h3>
      <p className="mt-1 text-[13px] text-muted">{hit.providerName}</p>

      <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-muted">
        {hit.shortDescription}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4">
        <div>
          <dt className="text-[11px] tracking-[0.06em] text-faint uppercase">Funding</dt>
          <dd className="mt-0.5 text-[14px] font-medium tracking-[-0.01em]">
            {fundingRangeLabel(
              hit.fundingMin,
              hit.fundingMax,
              hit.currency,
              hit.fundingAmountText,
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.06em] text-faint uppercase">Deadline</dt>
          <dd className="mt-0.5 text-[14px] font-medium tracking-[-0.01em]">
            {hit.isRollingDeadline ? "Rolling" : formatDate(hit.applicationDeadline)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {shownCategories.map((category) => (
          <span key={category.slug} className="pill">
            {category.name}
          </span>
        ))}
        <span className="pill">
          <MapPin className="size-3" strokeWidth={1.7} aria-hidden="true" />
          {location}
        </span>
      </div>

      <span className="mt-4 inline-flex items-center gap-1 text-[13.5px] font-medium text-ink">
        {oppCopy.cta.details}
        <ArrowUpRight
          className="size-3.5 transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </span>
    </article>
  );
}

export function OpportunityGrid({
  hits,
  savedIds,
}: {
  hits: SearchHit[];
  savedIds?: Set<string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {hits.map((hit) => (
        <OpportunityCard key={hit.id} hit={hit} saved={savedIds?.has(hit.id)} />
      ))}
    </div>
  );
}

export { CLOSING_SOON_DAYS };
