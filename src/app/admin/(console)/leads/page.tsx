import Link from "next/link";
import type { LeadStage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { MAX_SCORE } from "@/lib/leads/scoring";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const STAGE_LABEL: Record<LeadStage, string> = {
  ANONYMOUS_VISITOR: "Anonymous visitor",
  LEAD: "Lead",
  ENGAGED_LEAD: "Engaged lead",
  REGISTERED_USER: "Registered user",
  ACTIVE_STARTUP: "Active startup",
};

type Search = Record<string, string | undefined>;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where: Prisma.LeadWhereInput = {};
  const and: Prisma.LeadWhereInput[] = [];

  if (params.q) {
    and.push({
      OR: [
        { name: { contains: params.q, mode: "insensitive" } },
        { email: { contains: params.q, mode: "insensitive" } },
        { startupName: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }
  if (params.stage) and.push({ leadStage: params.stage as LeadStage });
  if (params.state) and.push({ state: { equals: params.state, mode: "insensitive" } });
  if (params.industry) and.push({ industryCategoryId: params.industry });
  if (params.consent === "email") and.push({ emailMarketingConsent: true, unsubscribedAt: null });
  if (params.consent === "whatsapp") and.push({ whatsappMarketingConsent: true, unsubscribedAt: null });
  if (params.active === "7")
    and.push({ lastActivityAt: { gte: new Date(Date.now() - 7 * 86_400_000) } });
  if (params.complete === "70") and.push({ profileCompletion: { gte: 70 } });
  if (params.hot === "1") and.push({ leadScore: { gte: 40 } });
  if (params.saved === "1") and.push({ saved: { some: {} } });
  if (params.reminders === "1")
    and.push({ subscriptions: { some: { frequency: "DEADLINE_REMINDER", active: true } } });
  if (params.viewed === "5")
    and.push({ activities: { some: { type: "opportunity_view" } } });
  if (params.funding)
    and.push({ fundingRequirementMax: { gte: Number(params.funding) || 0 } });

  if (and.length) where.AND = and;

  const [leads, total, stageCounts, industries, states] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ leadScore: "desc" }, { lastActivityAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        industryCategory: { select: { name: true } },
        stageCategory: { select: { name: true } },
        _count: { select: { saved: true, activities: true, interests: true } },
      },
    }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({ by: ["leadStage"], _count: { _all: true } }),
    prisma.category.findMany({
      where: { categoryType: "INDUSTRY", active: true, leadsByIndustry: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.findMany({
      where: { state: { not: null } },
      distinct: ["state"],
      select: { state: true },
      orderBy: { state: "asc" },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const exportQuery = new URLSearchParams(
    Object.entries(params).filter(([k, v]) => v && k !== "page") as [string, string][],
  ).toString();

  return (
    <>
      <PageHeader
        title="Leads"
        description="Everyone who has given us their details, and what they have been looking at."
        actions={
          <Link
            href={`/admin/leads/export${exportQuery ? `?${exportQuery}` : ""}`}
            className="btn btn-secondary btn-sm"
            prefetch={false}
          >
            Export CSV
          </Link>
        }
      />

      <PageBody>
        <form action="/admin/leads" className="mb-5 grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Name, email or startup"
              aria-label="Search leads"
              className="field h-9 w-[240px] text-[13.5px]"
            />
            <select name="stage" defaultValue={params.stage ?? ""} className="field h-9 w-auto pr-8 text-[13.5px]" aria-label="Lead stage">
              <option value="">Any stage</option>
              {(Object.keys(STAGE_LABEL) as LeadStage[]).map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABEL[stage]} ({stageCounts.find((s) => s.leadStage === stage)?._count._all ?? 0})
                </option>
              ))}
            </select>
            <select name="industry" defaultValue={params.industry ?? ""} className="field h-9 w-auto pr-8 text-[13.5px]" aria-label="Industry">
              <option value="">Any industry</option>
              {industries.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
            <select name="state" defaultValue={params.state ?? ""} className="field h-9 w-auto pr-8 text-[13.5px]" aria-label="State">
              <option value="">Any state</option>
              {states.map((row) => (
                <option key={row.state} value={row.state!}>
                  {row.state}
                </option>
              ))}
            </select>
            <select name="consent" defaultValue={params.consent ?? ""} className="field h-9 w-auto pr-8 text-[13.5px]" aria-label="Consent">
              <option value="">Any consent</option>
              <option value="email">Consented to email</option>
              <option value="whatsapp">Consented to WhatsApp</option>
            </select>
            <button type="submit" className="btn btn-secondary btn-sm">
              Apply
            </button>
            {Object.keys(params).length ? (
              <Link href="/admin/leads" className="btn btn-ghost btn-sm">
                Clear
              </Link>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <QuickFilter name="hot" value="1" label="Hot leads (40+)" active={params.hot === "1"} />
            <QuickFilter name="saved" value="1" label="Saved something" active={params.saved === "1"} />
            <QuickFilter name="reminders" value="1" label="Wants reminders" active={params.reminders === "1"} />
            <QuickFilter name="active" value="7" label="Active this week" active={params.active === "7"} />
            <QuickFilter name="complete" value="70" label="Profile 70%+" active={params.complete === "70"} />
          </div>
        </form>

        <p className="mb-3 text-[13px] text-muted">
          {total.toLocaleString("en-IN")} {total === 1 ? "lead" : "leads"}
        </p>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-subtle">
                  {["Startup", "Stage", "Interested in", "Activity", "Consent", "Score", "Last active"].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-[14px] text-muted">
                      No leads match this view.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-subtle/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="block max-w-[28ch] truncate text-[13.5px] font-medium underline-offset-2 hover:underline"
                        >
                          {lead.startupName ?? lead.name}
                        </Link>
                        <span className="block max-w-[28ch] truncate text-[12px] text-muted">
                          {lead.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("pill", lead.leadScore >= 40 && "pill-accent")}>
                          {STAGE_LABEL[lead.leadStage]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px]">
                        {lead.industryCategory?.name ?? "—"}
                        {lead.stageCategory ? (
                          <span className="text-muted"> · {lead.stageCategory.name}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums">
                        {lead._count.activities} events · {lead._count.saved} saved
                      </td>
                      <td className="px-4 py-3 text-[12.5px]">
                        <span className={lead.emailMarketingConsent ? "" : "text-faint"}>
                          Email {lead.emailMarketingConsent ? "✓" : "✗"}
                        </span>
                        <span className="text-faint"> · </span>
                        <span className={lead.whatsappMarketingConsent ? "" : "text-faint"}>
                          WA {lead.whatsappMarketingConsent ? "✓" : "✗"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] tabular-nums">
                        {lead.leadScore}/{MAX_SCORE}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted">
                        {formatDate(lead.lastActivityAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {pages > 1 ? (
          <nav className="mt-5 flex items-center justify-between" aria-label="Pagination">
            <p className="text-[13px] text-muted">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={`/admin/leads?${new URLSearchParams({ ...params, page: String(page - 1) } as Record<string, string>)}`} className="btn btn-secondary btn-sm">
                  Previous
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={`/admin/leads?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>)}`} className="btn btn-secondary btn-sm">
                  Next
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </PageBody>
    </>
  );
}

function QuickFilter({
  name,
  value,
  label,
  active,
}: {
  name: string;
  value: string;
  label: string;
  active: boolean;
}) {
  return (
    <label
      className={cn(
        "cursor-pointer rounded-[6px] border px-2.5 py-1 text-[12.5px] transition-colors duration-200",
        active ? "border-ink bg-ink text-white" : "border-line text-muted hover:border-line-strong",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={active}
        className="sr-only"
      />
      {label}
    </label>
  );
}
