import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { computeLeadScore, MAX_SCORE } from "@/lib/leads/scoring";
import { ACTIVITY_TYPES } from "@/lib/leads/activity";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      industryCategory: { select: { name: true } },
      stageCategory: { select: { name: true } },
      founderTypeCategory: { select: { name: true } },
      interests: {
        orderBy: { weight: "desc" },
        include: { category: { select: { name: true, slug: true } } },
      },
      saved: {
        orderBy: { updatedAt: "desc" },
        include: { opportunity: { select: { title: true, slug: true } } },
      },
      subscriptions: { include: { categories: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 60,
        include: { opportunity: { select: { title: true, slug: true } } },
      },
      visitors: { select: { utmSource: true, utmMedium: true, utmCampaign: true, referrer: true } },
    },
  });

  if (!lead) notFound();
  const breakdown = await computeLeadScore(lead.id);
  const attribution = lead.visitors[0];

  return (
    <>
      <PageHeader
        title={lead.startupName ?? lead.name}
        breadcrumbs={[{ label: "Leads", href: "/admin/leads" }, { label: lead.name }]}
        description={`${lead.email}${lead.whatsapp ? ` · ${lead.whatsapp}` : ""}`}
        actions={
          <span className={cn("pill", lead.leadScore >= 40 && "pill-accent")}>
            {lead.leadScore}/{MAX_SCORE} · {lead.leadStage.replace(/_/g, " ").toLowerCase()}
          </span>
        }
      />

      <PageBody>
        <div className="grid gap-8 xl:grid-cols-[1fr_320px] xl:items-start">
          <div className="grid gap-8">
            <section>
              <h2 className="eyebrow mb-3">Activity timeline</h2>
              <div className="card overflow-hidden">
                {lead.activities.length === 0 ? (
                  <p className="p-5 text-[13.5px] text-muted">Nothing recorded yet.</p>
                ) : (
                  <ol className="divide-y divide-line">
                    {lead.activities.map((activity) => (
                      <li key={activity.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3">
                        <span className="w-[92px] shrink-0 text-[12px] text-muted tabular-nums">
                          {formatDate(activity.createdAt)}
                        </span>
                        <span className="min-w-0 flex-1 text-[13.5px]">
                          {activity.description ??
                            ACTIVITY_TYPES[activity.type as keyof typeof ACTIVITY_TYPES] ??
                            activity.type}
                          {activity.opportunity ? (
                            <>
                              {" — "}
                              <Link
                                href={`/opportunities/${activity.opportunity.slug}`}
                                target="_blank"
                                className="underline underline-offset-2"
                              >
                                {activity.opportunity.title}
                              </Link>
                            </>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </section>

            {lead.saved.length ? (
              <section>
                <h2 className="eyebrow mb-3">Saved opportunities</h2>
                <ul className="card divide-y divide-line">
                  {lead.saved.map((row) => (
                    <li key={row.id} className="px-5 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <Link
                          href={`/opportunities/${row.opportunity.slug}`}
                          target="_blank"
                          className="text-[13.5px] underline-offset-2 hover:underline"
                        >
                          {row.opportunity.title}
                        </Link>
                        <span className="pill">{row.status.replace(/_/g, " ").toLowerCase()}</span>
                      </div>
                      {row.notes ? (
                        <p className="mt-1.5 text-[12.5px] text-muted">“{row.notes}”</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="grid gap-4">
            <Card title="Startup profile">
              <Row label="Founder" value={lead.name} />
              <Row label="Startup" value={lead.startupName ?? "—"} />
              <Row label="Industry" value={lead.industryCategory?.name ?? "—"} />
              <Row label="Stage" value={lead.stageCategory?.name ?? "—"} />
              <Row label="Founder type" value={lead.founderTypeCategory?.name ?? "—"} />
              <Row
                label="Location"
                value={[lead.city, lead.state, lead.country].filter(Boolean).join(", ") || "—"}
              />
              <Row label="Website" value={lead.website ?? "—"} />
              <Row label="LinkedIn" value={lead.linkedinUrl ?? "—"} />
              <Row label="Year founded" value={lead.yearFounded?.toString() ?? "—"} />
              <Row label="Team size" value={lead.teamSize ?? "—"} />
              <Row label="Revenue" value={lead.revenueRange ?? "—"} />
              <Row label="Raised" value={lead.fundingRaised ?? "—"} />
              <Row
                label="Needs"
                value={
                  lead.fundingRequirementMax
                    ? `${formatMoney(lead.fundingRequirementMin?.toString() ?? null) ?? "—"} – ${formatMoney(lead.fundingRequirementMax.toString())}`
                    : "—"
                }
              />
              <Row
                label="DPIIT"
                value={lead.dpiitStatus === null ? "—" : lead.dpiitStatus ? "Yes" : "No"}
              />
              <Row
                label="Udyam"
                value={lead.udyamStatus === null ? "—" : lead.udyamStatus ? "Yes" : "No"}
              />
              <Row label="Profile complete" value={`${lead.profileCompletion}%`} />
            </Card>

            <Card title="Consent">
              <Row label="Email" value={lead.emailMarketingConsent ? "Granted" : "Not granted"} />
              <Row label="WhatsApp" value={lead.whatsappMarketingConsent ? "Granted" : "Not granted"} />
              <Row label="Given" value={formatDate(lead.consentTimestamp)} />
              <Row label="Source" value={lead.consentSource ?? "—"} />
              {lead.unsubscribedAt ? (
                <Row label="Unsubscribed" value={formatDate(lead.unsubscribedAt)} />
              ) : null}
            </Card>

            <Card title="Where they came from">
              <Row label="Lead source" value={lead.leadSource ?? "—"} />
              <Row label="Landing page" value={lead.landingPath ?? "—"} />
              <Row label="Referrer" value={lead.referrer ?? attribution?.referrer ?? "—"} />
              <Row label="utm_source" value={lead.utmSource ?? attribution?.utmSource ?? "—"} />
              <Row label="utm_medium" value={lead.utmMedium ?? attribution?.utmMedium ?? "—"} />
              <Row label="utm_campaign" value={lead.utmCampaign ?? attribution?.utmCampaign ?? "—"} />
              <Row label="First visit" value={formatDate(lead.firstVisitAt)} />
              <Row label="Last active" value={formatDate(lead.lastActivityAt)} />
            </Card>

            {breakdown?.earned.length ? (
              <Card title={`Score ${breakdown.score}/${MAX_SCORE}`}>
                {breakdown.earned.map((rule) => (
                  <Row key={rule.key} label={rule.label} value={`+${rule.points}`} />
                ))}
              </Card>
            ) : null}

            {lead.interests.length ? (
              <section className="card p-4">
                <h3 className="mb-2.5 text-[13px] font-medium">Interested in</h3>
                <div className="flex flex-wrap gap-1.5">
                  {lead.interests.slice(0, 14).map((interest) => (
                    <span key={interest.id} className="pill">
                      {interest.category.name}
                      <span className="text-faint">{interest.weight}</span>
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <Card title="Alerts">
              {lead.subscriptions.length === 0 ? (
                <p className="text-[12.5px] text-muted">No subscriptions.</p>
              ) : (
                lead.subscriptions.map((subscription) => (
                  <Row
                    key={subscription.id}
                    label={`${subscription.frequency.replace(/_/g, " ").toLowerCase()} (${subscription.channel.toLowerCase()})`}
                    value={subscription.active ? "On" : "Off"}
                  />
                ))
              )}
            </Card>
          </aside>
        </div>
      </PageBody>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h3 className="mb-2.5 text-[13px] font-medium">{title}</h3>
      <dl className="grid gap-1.5 text-[12.5px]">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}
