import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SearchHit } from "@/lib/search";
import { daysUntil, formatDate } from "@/lib/utils";
import { Reveal } from "./reveal";

export function RadarStrip({
  closing,
  recent,
}: {
  closing: SearchHit[];
  recent: SearchHit[];
}) {
  const seen = new Set<string>();
  const items = [...closing, ...recent]
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 8);

  if (items.length < 2) return null;

  return (
    <section className="radar-strip border-b border-line" aria-label="Opportunities on the Radar">
      <div className="radar-strip-viewport">
        <div className={items.length > 2 ? "radar-strip-track is-moving" : "radar-strip-track"}>
          <RadarItems items={items} />
          {items.length > 2 ? <RadarItems items={items} duplicate /> : null}
        </div>
      </div>
    </section>
  );
}

function RadarItems({ items, duplicate = false }: { items: SearchHit[]; duplicate?: boolean }) {
  return (
    <div className="radar-strip-group" aria-hidden={duplicate || undefined}>
      {items.map((item, index) => {
        const days = item.isRollingDeadline ? null : daysUntil(item.applicationDeadline);
        const context =
          days !== null && days >= 0 && days <= 30
            ? days === 0
              ? "Closes today"
              : `Closing in ${days} days`
            : index % 2 === 0
              ? "New on the Radar"
              : "Opportunity";

        return (
          <Link
            key={`${duplicate ? "duplicate-" : ""}${item.id}`}
            href={`/opportunities/${item.slug}`}
            tabIndex={duplicate ? -1 : undefined}
            className="radar-strip-item group"
          >
            <span className="eyebrow text-[10px]">{context}</span>
            <span className="radar-strip-title">{item.title}</span>
            <span className="radar-strip-meta">
              {item.isRollingDeadline ? "Rolling deadline" : formatDate(item.applicationDeadline)}
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function HeroOpportunitySignals({
  closing,
  recent,
}: {
  closing?: SearchHit;
  recent?: SearchHit;
}) {
  const cards = [
    closing ? { item: closing, label: "Closing soon" } : null,
    recent && recent.id !== closing?.id ? { item: recent, label: "New on the Radar" } : null,
  ].filter(Boolean) as Array<{ item: SearchHit; label: string }>;

  if (cards.length === 0) return null;

  return (
    <div className="hidden xl:block" role="group" aria-label="Featured opportunities">
      <Reveal className="hero-signals grid" delay={260}>
        {cards.map(({ item, label }, index) => (
          <Link
            key={item.id}
            href={`/opportunities/${item.slug}`}
            className={`hero-signal-card hero-signal-card-${index + 1} group`}
          >
            <span className="eyebrow text-[10px]">{label}</span>
            <span className="mt-3 line-clamp-2 text-[16px] leading-tight font-medium tracking-[-0.02em]">
              {item.title}
            </span>
            <span className="mt-2 text-[12.5px] text-muted">{item.providerName}</span>
            <span className="mt-5 flex items-center justify-between border-t border-line pt-3 text-[12px] text-muted">
              {item.isRollingDeadline ? "Rolling deadline" : formatDate(item.applicationDeadline)}
              <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
            </span>
          </Link>
        ))}
      </Reveal>
    </div>
  );
}
