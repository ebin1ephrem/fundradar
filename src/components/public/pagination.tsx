import Link from "next/link";
import { buildQuery, type RawParams } from "@/lib/search/params";
import { cn } from "@/lib/utils";

export function Pagination({
  basePath,
  params,
  page,
  pages,
  total,
}: {
  basePath: string;
  params: RawParams;
  page: number;
  pages: number;
  total: number;
}) {
  if (pages <= 1) return null;

  const href = (target: number) =>
    `${basePath}${buildQuery(params, { page: target > 1 ? String(target) : undefined })}`;

  const window = new Set<number>([1, pages, page, page - 1, page + 1]);
  const numbers = [...window].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-between gap-4" aria-label="Pagination">
      <p className="text-[13px] text-muted">
        Page {page} of {pages} · {total.toLocaleString("en-IN")} opportunities
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link href={href(page - 1)} rel="prev" className="btn btn-secondary btn-sm">
            Previous
          </Link>
        ) : null}
        {numbers.map((n, i) => (
          <span key={n} className="flex items-center gap-1.5">
            {i > 0 && n - numbers[i - 1] > 1 ? (
              <span className="px-1 text-faint">…</span>
            ) : null}
            <Link
              href={href(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "grid h-9 min-w-9 place-items-center rounded-[6px] border px-2 text-[13.5px] transition-colors duration-200",
                n === page
                  ? "border-ink bg-ink text-white"
                  : "border-line text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {n}
            </Link>
          </span>
        ))}
        {page < pages ? (
          <Link href={href(page + 1)} rel="next" className="btn btn-secondary btn-sm">
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
