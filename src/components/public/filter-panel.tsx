import Link from "next/link";
import type { CategoryType } from "@prisma/client";
import { FundingType, GeographyScope, ProviderSector } from "@prisma/client";
import {
  DEADLINE_BANDS,
  FUNDING_BANDS,
  buildQuery,
  isSelected,
  toggleValue,
  type RawParams,
} from "@/lib/search/params";
import {
  FUNDING_TYPE_LABEL,
  GEOGRAPHY_SCOPE_LABEL,
  PROVIDER_SECTOR_LABEL,
} from "@/lib/validation/opportunity";
import { cn } from "@/lib/utils";

export type FilterCategory = {
  name: string;
  slug: string;
  categoryType: CategoryType;
  featured: boolean;
};

const DIMENSION_TITLES: Partial<Record<CategoryType, string>> = {
  OPPORTUNITY_TYPE: "Opportunity type",
  INDUSTRY: "Industry",
  STARTUP_STAGE: "Startup stage",
  FOUNDER_TYPE: "Founder category",
};

/**
 * Every control is a link, so filtering works without JavaScript, each
 * combination has a shareable URL, and the whole panel stays a server
 * component with no client bundle.
 */
export function FilterPanel({
  basePath,
  params,
  categories,
  counts,
  states,
  mode = "desktop",
}: {
  basePath: string;
  params: RawParams;
  categories: FilterCategory[];
  counts: Map<string, number>;
  states: string[];
  mode?: "desktop" | "drawer";
}) {
  const href = (changes: Record<string, string | string[] | undefined | null>) =>
    `${basePath}${buildQuery(params, changes)}`;

  return (
    <div className="grid gap-6">
      {(Object.keys(DIMENSION_TITLES) as CategoryType[]).map((dimension) => {
        const items = categories.filter((c) => c.categoryType === dimension);
        if (items.length === 0) return null;
        const chosen = items.filter((c) => isSelected(params, "c", c.slug));
        // Long dimensions collapse to the featured ones plus anything picked.
        const visible =
          dimension === "INDUSTRY" && items.length > 10
            ? [
                ...new Set([
                  ...chosen,
                  ...items.filter((c) => c.featured),
                  ...items.filter((c) => (counts.get(c.slug) ?? 0) > 0),
                ]),
              ].slice(0, 12)
            : items;

        return (
          <FilterGroup
            key={dimension}
            title={DIMENSION_TITLES[dimension]!}
            collapsible={mode === "drawer"}
            selectedCount={chosen.length}
          >
            {visible.map((item) => (
              <FilterCheck
                key={item.slug}
                label={item.name}
                count={counts.get(item.slug)}
                checked={isSelected(params, "c", item.slug)}
                href={href(toggleValue(params, "c", item.slug))}
              />
            ))}
            {visible.length < items.length ? (
              <Link
                href="/categories"
                className="mt-1 text-[13px] text-muted underline underline-offset-2 hover:text-ink"
              >
                All {items.length} categories
              </Link>
            ) : null}
          </FilterGroup>
        );
      })}

      <FilterGroup
        title="Funding amount"
        collapsible={mode === "drawer"}
        selectedCount={params.funding ? 1 : 0}
      >
        {FUNDING_BANDS.map((band) => (
          <FilterCheck
            key={band.key}
            label={band.label}
            radio
            checked={params.funding === band.key}
            href={href({
              funding: params.funding === band.key ? undefined : band.key,
            })}
          />
        ))}
      </FilterGroup>

      <FilterGroup
        title="Funding type"
        collapsible={mode === "drawer"}
        selectedCount={Object.values(FundingType).filter((type) =>
          isSelected(params, "type", type),
        ).length}
      >
        {Object.values(FundingType)
          .filter((type) => type !== FundingType.SUBSIDY)
          .map((type) => (
            <FilterCheck
              key={type}
              label={FUNDING_TYPE_LABEL[type]}
              checked={isSelected(params, "type", type)}
              href={href(toggleValue(params, "type", type))}
            />
          ))}
      </FilterGroup>

      <FilterGroup
        title="Deadline"
        collapsible={mode === "drawer"}
        selectedCount={(params.closing ? 1 : 0) + (params.closed === "1" ? 1 : 0)}
      >
        {DEADLINE_BANDS.map((band) => (
          <FilterCheck
            key={band.key}
            label={band.label}
            radio
            checked={params.closing === band.key}
            href={href({
              closing: params.closing === band.key ? undefined : band.key,
            })}
          />
        ))}
        <FilterCheck
          label="Include closed programmes"
          checked={params.closed === "1"}
          href={href({ closed: params.closed === "1" ? undefined : "1" })}
        />
      </FilterGroup>

      <FilterGroup
        title="Location"
        collapsible={mode === "drawer"}
        selectedCount={
          Object.values(GeographyScope).filter((scope) =>
            isSelected(params, "scope", scope),
          ).length + (params.state ? 1 : 0)
        }
      >
        {Object.values(GeographyScope).map((scope) => (
          <FilterCheck
            key={scope}
            label={GEOGRAPHY_SCOPE_LABEL[scope]}
            checked={isSelected(params, "scope", scope)}
            href={href(toggleValue(params, "scope", scope))}
          />
        ))}
        {states.length > 0 ? (
          <form action={basePath} className="mt-2">
            {Object.entries(params).map(([key, value]) =>
              key === "state" || key === "page"
                ? null
                : (Array.isArray(value) ? value : [value]).map((v, i) =>
                    v ? (
                      <input key={`${key}-${i}`} type="hidden" name={key} value={v} />
                    ) : null,
                  ),
            )}
            <label className="sr-only" htmlFor={`state-filter-${mode}`}>
              State
            </label>
            <select
              id={`state-filter-${mode}`}
              name="state"
              defaultValue={typeof params.state === "string" ? params.state : ""}
              className="field h-10 text-[13.5px]"
            >
              <option value="">Any state</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary btn-sm mt-2 w-full">
              Apply state
            </button>
          </form>
        ) : null}
      </FilterGroup>

      <FilterGroup
        title="Provider"
        collapsible={mode === "drawer"}
        selectedCount={Object.values(ProviderSector).filter((sector) =>
          isSelected(params, "provider", sector),
        ).length}
      >
        {Object.values(ProviderSector).map((sector) => (
          <FilterCheck
            key={sector}
            label={PROVIDER_SECTOR_LABEL[sector]}
            checked={isSelected(params, "provider", sector)}
            href={href(toggleValue(params, "provider", sector))}
          />
        ))}
      </FilterGroup>

      <FilterGroup
        title="Other"
        collapsible={mode === "drawer"}
        selectedCount={
          (params.equityFree === "1" ? 1 : 0) +
          (params.registration === "1" ? 1 : 0)
        }
      >
        <FilterCheck
          label="Equity-free only"
          checked={params.equityFree === "1"}
          href={href({ equityFree: params.equityFree === "1" ? undefined : "1" })}
        />
        <FilterCheck
          label="Requires DPIIT or Udyam"
          checked={params.registration === "1"}
          href={href({
            registration: params.registration === "1" ? undefined : "1",
          })}
        />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  title,
  children,
  collapsible = false,
  selectedCount = 0,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  selectedCount?: number;
}) {
  if (collapsible) {
    return (
      <details
        open={selectedCount > 0}
        className="group border-b border-line pb-1 last:border-b-0"
      >
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-[14px] font-medium">
          <span>{title}</span>
          <span className="flex items-center gap-2">
            <span className={cn("text-[12px] tabular-nums", selectedCount ? "text-ink" : "text-faint")}>
              {selectedCount}
            </span>
            <svg
              viewBox="0 0 16 16"
              className="size-4 text-muted transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            >
              <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </summary>
        <div className="grid gap-0.5 pb-4">{children}</div>
      </details>
    );
  }

  return (
    <fieldset className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <legend className="eyebrow mb-2.5">{title}</legend>
      <div className="grid gap-0.5">{children}</div>
    </fieldset>
  );
}

function FilterCheck({
  label,
  href,
  checked,
  count,
  radio,
}: {
  label: string;
  href: string;
  checked: boolean;
  count?: number;
  radio?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-pressed={checked}
      className={cn(
        "flex items-center gap-2.5 rounded-[6px] px-1.5 py-1.5 text-[13.5px] transition-colors duration-200",
        checked ? "text-ink" : "text-muted hover:bg-subtle hover:text-ink",
      )}
    >
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center border transition-colors duration-200",
          radio ? "rounded-full" : "rounded-[4px]",
          checked ? "border-ink bg-ink text-accent" : "border-line-strong",
        )}
        aria-hidden="true"
      >
        {checked ? (
          radio ? (
            <span className="size-1.5 rounded-full bg-accent" />
          ) : (
            <svg viewBox="0 0 12 12" className="size-2.5">
              <path
                d="M2 6.2l2.6 2.6L10 3.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )
        ) : null}
      </span>
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{label}</span>
      {count !== undefined ? (
        <span className="shrink-0 text-[12px] text-faint tabular-nums">{count}</span>
      ) : null}
    </Link>
  );
}
