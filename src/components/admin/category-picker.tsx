"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  );

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

  const setGroupOpen = (key: string, open: boolean) => {
    setExpandedGroups((previous) => {
      const next = new Set(previous);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  };

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
                {type === "OPPORTUNITY_TYPE" && opportunityTypeSelected.length > 0 ? (
                  <div className="mb-4 rounded-[9px] border border-line bg-subtle p-3">
                    <p className="eyebrow mb-2">Selected</p>
                    <div className="flex flex-wrap gap-1.5">
                      {opportunityTypeSelected.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => toggle(category.id)}
                          className="pill min-h-8 cursor-pointer gap-1.5 bg-canvas pr-2 hover:border-line-strong"
                          aria-label={`Remove ${category.name}`}
                        >
                          <span className="max-w-[220px] truncate">{category.name}</span>
                          <X className="size-3" strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {items.length === 0 ? (
                  <p className="px-1 py-2 text-[13px] text-muted">
                    Nothing matches “{query}”.
                  </p>
                ) : categories.filter((c) => c.categoryType === type).length > 10 &&
                  categories.some(
                    (c) => c.categoryType === type && c.parentId !== null,
                  ) ? (
                  <CategoryGroups
                    type={type}
                    items={categories.filter((c) => c.categoryType === type)}
                    selected={selected}
                    needle={needle}
                    matches={matches}
                    expanded={expandedGroups}
                    setGroupOpen={setGroupOpen}
                    toggle={toggle}
                  />
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
                            <span className="block text-[13px] leading-tight [overflow-wrap:anywhere]">
                              {c.name}
                            </span>
                            {c.parentName ? (
                              <span className="mt-0.5 block text-[11px] text-faint [overflow-wrap:anywhere]">
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

type CategoryGroup = {
  parent: PickerCategory;
  items: PickerCategory[];
};

function buildGroups(items: PickerCategory[]): CategoryGroup[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const children = new Map<string, PickerCategory[]>();

  for (const item of items) {
    if (!item.parentId || !byId.has(item.parentId)) continue;
    const siblings = children.get(item.parentId) ?? [];
    siblings.push(item);
    children.set(item.parentId, siblings);
  }

  const descendants = (parent: PickerCategory): PickerCategory[] => {
    const direct = children.get(parent.id) ?? [];
    return direct.flatMap((child) => [child, ...descendants(child)]);
  };

  return items
    .filter((item) => !item.parentId || !byId.has(item.parentId))
    .map((parent) => ({ parent, items: [parent, ...descendants(parent)] }));
}

function CategoryGroups({
  type,
  items,
  selected,
  needle,
  matches,
  expanded,
  setGroupOpen,
  toggle,
}: {
  type: CategoryType;
  items: PickerCategory[];
  selected: Set<string>;
  needle: string;
  matches: (category: PickerCategory) => boolean;
  expanded: Set<string>;
  setGroupOpen: (key: string, open: boolean) => void;
  toggle: (id: string) => void;
}) {
  const groups = buildGroups(items);

  return (
    <div className="grid gap-2">
      {groups.map((group) => {
        const visible = group.items.filter(matches);
        if (visible.length === 0) return null;

        const key = `${type}:${group.parent.id}`;
        const selectedCount = group.items.filter((item) => selected.has(item.id)).length;
        const forcedOpen = selectedCount > 0 || Boolean(needle);
        const isOpen = forcedOpen || expanded.has(key);

        return (
          <details
            key={key}
            open={isOpen}
            onToggle={(event) => {
              if (forcedOpen) return;
              setGroupOpen(key, event.currentTarget.open);
            }}
            className="group/category rounded-[9px] border border-line bg-canvas"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
              <span className="min-w-0 text-[13.5px] font-medium [overflow-wrap:anywhere]">
                {group.parent.name}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={cn("text-[12px]", selectedCount ? "text-ink" : "text-faint")}>
                  {selectedCount ? `${selectedCount} selected` : "0"}
                </span>
                <ChevronDown
                  className="size-4 text-muted transition-transform duration-200 group-open/category:rotate-180"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </span>
            </summary>

            <div className="border-t border-line p-2.5">
              <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((category) => {
                  const isOn = selected.has(category.id);
                  return (
                    <label
                      key={category.id}
                      className={cn(
                        "flex min-w-0 cursor-pointer items-start gap-2 rounded-[7px] border px-2.5 py-2 transition-colors duration-200",
                        isOn
                          ? "border-ink bg-subtle"
                          : "border-line hover:border-line-strong hover:bg-subtle",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isOn}
                        onChange={() => toggle(category.id)}
                        className="mt-0.5 size-3.5 shrink-0 accent-ink"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] leading-tight [overflow-wrap:anywhere]">
                          {category.name}
                        </span>
                        {category.parentName ? (
                          <span className="mt-0.5 block text-[11px] text-faint [overflow-wrap:anywhere]">
                            {category.parentName}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
