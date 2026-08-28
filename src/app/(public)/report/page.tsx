import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { publiclyVisible } from "@/lib/visibility";
import { reportError as reportCopy } from "@/content/copy";
import { ReportForm } from "./form";

export const metadata: Metadata = {
  title: "Report an error",
  description:
    "Noticed something wrong in a FundRadar listing? Tell us and we'll check it against the official source.",
  alternates: { canonical: "/report" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ o?: string; q?: string }>;
}) {
  const { o, q } = await searchParams;

  const opportunity = o
    ? await prisma.opportunity.findFirst({
        where: { slug: o, ...publiclyVisible },
        select: { slug: true, title: true, providerName: true },
      })
    : null;

  // Someone who arrived from the footer has no listing in hand yet, so they
  // pick one first — a report has to be about something specific.
  const matches =
    !opportunity && q
      ? await prisma.opportunity.findMany({
          where: {
            ...publiclyVisible,
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { providerName: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { slug: true, title: true, providerName: true },
          orderBy: { publishedAt: "desc" },
          take: 10,
        })
      : [];

  return (
    <div className="page-shell py-14 lg:py-20">
      <div className="max-w-[560px]">
        <h1 className="display-md max-w-[20ch]">{reportCopy.headline}</h1>
        <p className="lede mt-3">{reportCopy.body}</p>

        {opportunity ? (
          <>
            <div className="mt-7 rounded-[10px] border border-line bg-subtle px-4 py-3">
              <p className="text-[12.5px] text-muted">Listing</p>
              <p className="mt-0.5 text-[15px] font-medium tracking-[-0.02em]">
                {opportunity.title}
              </p>
              <p className="text-[13.5px] text-muted">
                {opportunity.providerName}
              </p>
            </div>
            <ReportForm slug={opportunity.slug} />
          </>
        ) : (
          <div className="mt-8">
            <form action="/report" className="relative">
              <label htmlFor="report-q" className="text-[13px] font-medium">
                Which listing?
              </label>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
                <input
                  id="report-q"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Search by title or provider"
                  className="field pr-[104px] pl-11"
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm absolute top-1/2 right-1.5 -translate-y-1/2"
                >
                  Search
                </button>
              </div>
            </form>

            {q ? (
              matches.length ? (
                <ul className="mt-5 grid gap-1.5">
                  {matches.map((match) => (
                    <li key={match.slug}>
                      <Link
                        href={`/report?o=${match.slug}`}
                        className="block rounded-[8px] border border-line px-4 py-3 transition-colors duration-200 hover:border-ink"
                      >
                        <span className="block text-[14.5px] font-medium tracking-[-0.02em]">
                          {match.title}
                        </span>
                        <span className="block text-[13px] text-muted">
                          {match.providerName}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-[14px] text-muted">
                  Nothing matched “{q}”. Try the provider&apos;s name, or open the
                  listing and use the Report an error link on it.
                </p>
              )
            ) : (
              <p className="mt-5 text-[14px] text-muted">
                Or open the listing and use the{" "}
                <span className="text-ink">Report an error</span> link at the
                bottom of it.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
