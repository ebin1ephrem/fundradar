"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SORTS, SORT_LABEL } from "@/lib/search/types";

export function SortSelect({
  basePath,
  value,
  hasQuery,
  compact = false,
}: {
  basePath: string;
  value: string;
  hasQuery: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // "Best match" only means something when there is something to match against.
  const options = SORTS.filter((s) => s !== "relevance" || hasQuery);

  return (
    <label className="flex min-w-0 items-center gap-2 text-[13.5px] text-muted">
      <span className={compact ? "sr-only" : "whitespace-nowrap"}>Sort by</span>
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = new URLSearchParams(searchParams);
          next.set("sort", event.target.value);
          next.delete("page");
          startTransition(() => router.push(`${basePath}?${next.toString()}`));
        }}
        className={compact ? "field h-11 min-w-0 pr-8 text-[13.5px]" : "field h-9 w-auto pr-8 text-[13.5px]"}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {SORT_LABEL[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
