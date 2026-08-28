import Link from "next/link";
import type { SavedStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLead } from "@/lib/leads/identity";
import { formatDate, fundingRangeLabel, cn } from "@/lib/utils";
import { deadlineLabel, lifecycleStatus, LIFECYCLE_LABEL } from "@/lib/opportunity-status";
import { SavedRowControls } from "./controls";

export const dynamic = "force-dynamic";

const TABS: { key: SavedStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "SAVED", label: "Saved" },
  { key: "INTERESTED", label: "Interested" },
  { key: "APPLIED", label: "Applied" },
  { key: "NOT_RELEVANT", label: "Not relevant" },
];

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const lead = await requireLead();
  const { status } = await searchParams;
  const active = TABS.some((t) => t.key === status) ? status! : "ALL";

  const rows = await prisma.savedOpportunity.findMany({
    where: {
      leadId: lead.id,
      ...(active === "ALL" ? {} : { status: active as SavedStatus }),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      opportunity: {
        select: {
          id: true,
          slug: true,
          title: true,
          providerName: true,
          fundingMin: true,
          fundingMax: true,
          currency: true,
          fundingAmountText: true,
          applicationDeadline: true,
          isRollingDeadline: true,
          applicationOpenDate: true,
          lifecycleOverride: true,
        },
      },
    },
  });

  const counts = await prisma.savedOpportunity.groupBy({
    by: ["status"],
    where: { leadId: lead.id },
    _count: { _all: true },
  });
  const countFor = (key: string) =>
    key === "ALL"
      ? counts.reduce((sum, c) => sum + c._count._all, 0)
      : (counts.find((c) => c.status === key)?._count._all ?? 0);

  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-1.5" aria-label="Saved status">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "ALL" ? "/dashboard/saved" : `/dashboard/saved?status=${tab.key}`}
            aria-current={tab.key === active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-[7px] border px-3 py-1.5 text-[13px] transition-colors duration-200",
              tab.key === active
                ? "border-ink bg-ink text-white"
                : "border-line text-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "text-[11.5px] tabular-nums",
                tab.key === active ? "text-accent" : "text-faint",
              )}
            >
              {countFor(tab.key)}
            </span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-[17px] font-medium tracking-[-0.02em]">
            Nothing saved here yet
          </p>
          <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-muted">
            Save an opportunity from anywhere on the site and it lands here, with
            room for your own notes.
          </p>
          <Link href="/opportunities" className="btn btn-secondary mt-6">
            Find opportunities
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row) => {
            const life = lifecycleStatus(row.opportunity);
            return (
              <li key={row.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "pill",
                          life === "CLOSING_SOON" && "pill-accent",
                          life === "CLOSED" && "text-faint",
                        )}
                      >
                        {LIFECYCLE_LABEL[life]}
                      </span>
                      <span className="pill">
                        {deadlineLabel(
                          row.opportunity.applicationDeadline,
                          row.opportunity.isRollingDeadline,
                        )}
                      </span>
                    </div>
                    <h2 className="text-[17px] leading-tight font-medium tracking-[-0.02em]">
                      <Link
                        href={`/opportunities/${row.opportunity.slug}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {row.opportunity.title}
                      </Link>
                    </h2>
                    <p className="mt-1 text-[13px] text-muted">
                      {row.opportunity.providerName} ·{" "}
                      {fundingRangeLabel(
                        row.opportunity.fundingMin?.toString() ?? null,
                        row.opportunity.fundingMax?.toString() ?? null,
                        row.opportunity.currency,
                        row.opportunity.fundingAmountText,
                      )}
                      {row.opportunity.isRollingDeadline
                        ? " · Rolling"
                        : ` · ${formatDate(row.opportunity.applicationDeadline)}`}
                    </p>
                  </div>
                </div>

                <SavedRowControls
                  savedId={row.id}
                  status={row.status}
                  notes={row.notes ?? ""}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
