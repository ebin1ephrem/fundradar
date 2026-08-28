import { prisma } from "@/lib/prisma";
import { requireLead } from "@/lib/leads/identity";
import { computeLeadScore } from "@/lib/leads/scoring";
import { signOutLeadAction } from "@/app/actions/leads";
import { ProfileForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const lead = await requireLead();

  const [industries, stages, founderTypes, breakdown] = await Promise.all([
    prisma.category.findMany({
      where: { active: true, categoryType: "INDUSTRY" },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { active: true, categoryType: "STARTUP_STAGE" },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { active: true, categoryType: "FOUNDER_TYPE" },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    computeLeadScore(lead.id),
  ]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_300px] lg:items-start">
      <div className="max-w-[640px]">
        <h2 className="display-md">Your startup</h2>
        <p className="lede mt-2">
          Every field is optional. The more we know, the better the matches — and
          nothing here is ever required to browse.
        </p>

        <div className="mt-8">
          <ProfileForm
            lead={{
              startupName: lead.startupName,
              website: lead.website,
              linkedinUrl: lead.linkedinUrl,
              city: lead.city,
              state: lead.state,
              country: lead.country,
              industryCategoryId: lead.industryCategoryId,
              stageCategoryId: lead.stageCategoryId,
              founderTypeCategoryId: lead.founderTypeCategoryId,
              yearFounded: lead.yearFounded,
              teamSize: lead.teamSize,
              revenueRange: lead.revenueRange,
              fundingRaised: lead.fundingRaised,
              fundingRequirementMin: lead.fundingRequirementMin?.toString() ?? null,
              fundingRequirementMax: lead.fundingRequirementMax?.toString() ?? null,
              dpiitStatus: lead.dpiitStatus,
              udyamStatus: lead.udyamStatus,
            }}
            industries={industries}
            stages={stages}
            founderTypes={founderTypes}
          />
        </div>
      </div>

      <aside className="grid gap-4">
        <section className="card p-5">
          <h3 className="text-[13px] font-medium">Profile completion</h3>
          <p className="mt-2 font-display text-[32px] leading-none font-medium tracking-[-0.035em] tabular-nums">
            {lead.profileCompletion}%
          </p>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle"
            role="progressbar"
            aria-valuenow={lead.profileCompletion}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completion"
          >
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${Math.max(4, lead.profileCompletion)}%` }}
            />
          </div>
          {breakdown?.earned.length ? (
            <ul className="mt-4 grid gap-1.5 border-t border-line pt-3">
              {breakdown.earned.map((rule) => (
                <li key={rule.key} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="text-muted">{rule.label}</span>
                  <span className="tabular-nums">+{rule.points}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="card p-5">
          <h3 className="text-[13px] font-medium">Account</h3>
          <p className="mt-2 text-[13px] text-muted">{lead.email}</p>
          {lead.whatsapp ? (
            <p className="text-[13px] text-muted">{lead.whatsapp}</p>
          ) : null}
          <form action={signOutLeadAction} className="mt-4">
            <button
              type="submit"
              className="text-[12.5px] text-muted underline underline-offset-2 hover:text-ink"
            >
              Sign out on this device
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}
