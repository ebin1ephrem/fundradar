"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CategoryType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { CATEGORY_TYPE_HINT, CATEGORY_TYPE_LABEL } from "@/lib/validation/category";

export type PickerCategory = {
  id: string;
  name: string;
  slug: string;
  categoryType: CategoryType;
  parentId: string | null;
  parentName: string | null;
};

/**
 * Multi-select across every classification dimension. One opportunity can be a
 * Grant and an Incubation Program and CSR Funding at the same time — that is
 * expected, not an edge case.
 */
export function CategoryPicker({
  categories,
  defaultSelected,
  defaultPrimary,
  order,
}: {
  categories: PickerCategory[];
  defaultSelected: string[];
  defaultPrimary?: string | null;
  order?: CategoryType[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(defaultSelected),
  );
  const [primary, setPrimary] = useState<string | null>(defaultPrimary ?? null);
  const [query, setQuery] = useState("");

  const types = useMemo(() => {
    const preferred: CategoryType[] = order ?? [
      "OPPORTUNITY_TYPE",
      "INDUSTRY",
      "STARTUP_STAGE",
      "FOUNDER_TYPE",
      "PROVIDER_TYPE",
      "GEOGRAPHY",
    ];
    return preferred.filter((t) => categories.some((c) => c.categoryType === t));
  }, [categories, order]);

  const needle = query.trim().toLowerCase();
  const matches = (c: PickerCategory) =>
    !needle ||
    c.name.toLowerCase().includes(needle) ||
    (c.parentName?.toLowerCase().includes(needle) ?? false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (primary === id) setPrimary(null);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const opportunityTypeSelected = categories.filter(
    (c) => c.categoryType === "OPPORTUNITY_TYPE" && selected.has(c.id),
  );

  return (
    <div className="grid gap-4">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="categoryIds" value={id} />
      ))}
      <input type="hidden" name="primaryCategoryId" value={primary ?? ""} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint"
            strokeWidth={1.6}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter categories"
            aria-label="Filter categories"
            className="field pl-10"
          />
        </div>
        <p className="text-[13px] text-muted tabular-nums">
          {selected.size} selected
        </p>
      </div>

      {opportunityTypeSelected.length > 0 ? (
        <div className="rounded-[10px] border border-line bg-subtle p-3.5">
          <p className="mb-2 text-[12px] font-medium">
            Primary category
            <span className="ml-1.5 font-normal text-muted">
              — the one this opportunity is filed under first
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {opportunityTypeSelected.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setPrimary(primary === c.id ? null : c.id)}
                aria-pressed={primary === c.id}
                className={cn(
                  "pill cursor-pointer transition-colors duration-200",
                  primary === c.id ? "pill-accent" : "hover:border-line-strong",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3">
        {types.map((type) => {
          const items = categories
            .filter((c) => c.categoryType === type)
            .filter(matches);
          const chosen = categories.filter(
            (c) => c.categoryType === type && selected.has(c.id),
          ).length;

          return (
            <details
              key={type}
              open={type === "OPPORTUNITY_TYPE" || chosen > 0 || Boolean(needle)}
              className="group rounded-[10px] border border-line bg-canvas"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="text-[13.5px] font-medium">
                    {CATEGORY_TYPE_LABEL[type]}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted">
                    {CATEGORY_TYPE_HINT[type]}
                  </span>
                </span>
                <span
                  className={cn(
                    "pill shrink-0",
                    chosen > 0 ? "pill-dark" : "text-faint",
                  )}
                >
                  {chosen > 0 ? `${chosen} selected` : "None"}
                </span>
              </summary>

              <div className="border-t border-line p-3">
                {items.length === 0 ? (
                  <p className="px-1 py-2 text-[13px] text-muted">
                    Nothing matches “{query}”.
                  </p>
                ) : (
                  <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((c) => {
                      const isOn = selected.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-2 rounded-[7px] border px-2.5 py-2 transition-colors duration-200",
                            isOn
                              ? "border-ink bg-subtle"
                              : "border-line hover:border-line-strong hover:bg-subtle",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isOn}
                            onChange={() => toggle(c.id)}
                            className="mt-0.5 size-3.5 shrink-0 accent-ink"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] leading-tight">
                              {c.name}
                            </span>
                            {c.parentName ? (
                              <span className="block truncate text-[11px] text-faint">
                                {c.parentName}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
