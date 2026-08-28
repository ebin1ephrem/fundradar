import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat";
import { CLOSING_SOON_DAYS } from "@/lib/opportunity-status";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const now = new Date();
  const closingCutoff = new Date(Date.now() + CLOSING_SOON_DAYS * 86_400_000);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [
    totalOpportunities,
    publishedOpportunities,
    closingSoon,
    newThisWeek,
    drafts,
    sourcesMonitored,
    crawlerJobs,
    crawlerErrors,
    updatesDetected,
    pendingReviews,
    registeredStartups,
    newLeads,
    emailSubscribers,
    recentAudit,
  ] = await Promise.all([
    prisma.opportunity.count(),
    prisma.opportunity.count({ where: { workflowStatus: "PUBLISHED", isActive: true } }),
    prisma.opportunity.count({
      where: {
        workflowStatus: "PUBLISHED",
        isActive: true,
        isRollingDeadline: false,
        applicationDeadline: { gte: now, lte: closingCutoff },
      },
    }),
    prisma.opportunity.count({
      where: { workflowStatus: "PUBLISHED", publishedAt: { gte: weekAgo } },
    }),
    prisma.opportunity.count({ where: { workflowStatus: "DRAFT" } }),
    prisma.source.count({ where: { enabled: true } }),
    prisma.crawlJob.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }),
    prisma.source.count({ where: { health: { in: ["ERROR", "BLOCKED"] } } }),
    prisma.reviewItem.count({
      where: {
        type: "UPDATE",
        status: { in: ["UNASSIGNED", "ASSIGNED", "UNDER_REVIEW", "READY_FOR_APPROVAL"] },
      },
    }),
    prisma.reviewItem.count({
      where: { status: { in: ["UNASSIGNED", "ASSIGNED", "UNDER_REVIEW", "READY_FOR_APPROVAL"] } },
    }),
    prisma.lead.count({ where: { leadStage: { in: ["REGISTERED_USER", "ACTIVE_STARTUP"] } } }),
    prisma.lead.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.lead.count({ where: { emailMarketingConsent: true, unsubscribedAt: null } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { adminUser: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title={`Good to see you, ${admin.name.split(" ")[0]}`}
        description="The state of the funding database, the collection pipeline and the startup leads it brings in."
        actions={
          <Link href="/admin/opportunities/new" className="btn btn-primary btn-sm">
            Add opportunity
          </Link>
        }
      />

      <PageBody>
        <section>
          <h2 className="eyebrow mb-3">Funding database</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile
              label="Published"
              value={publishedOpportunities}
              hint="Live on the public site"
              href="/admin/opportunities?status=PUBLISHED"
            />
            <StatTile
              label="Closing soon"
              value={closingSoon}
              hint={`Deadline within ${CLOSING_SOON_DAYS} days`}
              href="/admin/opportunities?closing=soon"
              emphasis
            />
            <StatTile
              label="New this week"
              value={newThisWeek}
              hint="Published in the last 7 days"
            />
            <StatTile
              label="Drafts"
              value={drafts}
              hint="Not yet published"
              href="/admin/opportunities?status=DRAFT"
            />
            <StatTile
              label="Total records"
              value={totalOpportunities}
              hint="Every status"
              href="/admin/opportunities"
            />
          </div>
        </section>

        <section className="mt-9">
          <h2 className="eyebrow mb-3">Collection pipeline</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatTile
              label="Sources monitored"
              value={sourcesMonitored}
              hint="Enabled sources"
              href="/admin/sources"
            />
            <StatTile
              label="Crawler jobs"
              value={crawlerJobs}
              hint="Queued or running"
              href="/admin/jobs"
            />
            <StatTile
              label="Source errors"
              value={crawlerErrors}
              hint="Error or blocked"
              href="/admin/sources"
              emphasis
            />
            <StatTile
              label="Updates detected"
              value={updatesDetected}
              hint="Awaiting approval"
              href="/admin/review?tab=updates"
              emphasis
            />
            <StatTile
              label="Pending reviews"
              value={pendingReviews}
              hint="In the review queue"
              href="/admin/review"
              emphasis
            />
          </div>
          <p className="hint mt-3">
            Collection, extraction and change detection are automatic. Publishing
            never is — every record passes through review.
          </p>
        </section>

        <section className="mt-9">
          <h2 className="eyebrow mb-3">Startups</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="New leads (7 days)" value={newLeads} />
            <StatTile label="Registered startups" value={registeredStartups} />
            <StatTile label="Email subscribers" value={emailSubscribers} hint="With marketing consent" />
          </div>
        </section>

        <section className="mt-9">
          <h2 className="eyebrow mb-3">Recent admin activity</h2>
          <div className="card overflow-hidden">
            {recentAudit.length === 0 ? (
              <p className="p-5 text-[13.5px] text-muted">
                Nothing recorded yet. Actions you take in the console appear here.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {recentAudit.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3"
                  >
                    <span className="text-[13.5px]">
                      {entry.summary ?? `${entry.action} on ${entry.entityType}`}
                    </span>
                    <span className="text-[12.5px] text-muted">
                      {entry.adminUser?.name ?? "System"} · {formatDate(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </PageBody>
    </>
  );
}
