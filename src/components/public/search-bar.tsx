import { Search } from "lucide-react";
import type { RawParams } from "@/lib/search/params";
import { search as searchCopy } from "@/content/copy";

/** A plain GET form — no JavaScript needed to search. */
export function SearchBar({
  action = "/opportunities",
  params,
  defaultValue,
  placeholder = searchCopy.placeholder,
  size = "md",
}: {
  action?: string;
  params?: RawParams;
  defaultValue?: string;
  placeholder?: string;
  size?: "md" | "lg";
}) {
  const carried = Object.entries(params ?? {}).filter(
    ([key]) => key !== "q" && key !== "page",
  );

  return (
    <form action={action} role="search" className="relative w-full">
      {carried.map(([key, value]) =>
        (Array.isArray(value) ? value : [value]).map((v, i) =>
          v ? <input key={`${key}-${i}`} type="hidden" name={key} value={v} /> : null,
        ),
      )}
      <label htmlFor="q" className="sr-only">
        Search funding opportunities
      </label>
      <Search
        className={
          size === "lg"
            ? "pointer-events-none absolute top-1/2 left-5 size-[18px] -translate-y-1/2 text-faint"
            : "pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint"
        }
        strokeWidth={1.7}
        aria-hidden="true"
      />
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={
          size === "lg"
            ? "field h-[60px] rounded-[10px] pr-[132px] pl-[52px] text-[16px]"
            : "field pr-[104px] pl-11"
        }
      />
      <button
        type="submit"
        className={
          size === "lg"
            ? "btn btn-primary absolute top-1/2 right-2 h-[46px] -translate-y-1/2"
            : "btn btn-primary btn-sm absolute top-1/2 right-1.5 -translate-y-1/2"
        }
      >
        Search
      </button>
    </form>
  );
}
