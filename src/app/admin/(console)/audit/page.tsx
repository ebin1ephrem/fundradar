import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const where = params.entity ? { entityType: params.entity } : {};

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { adminUser: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Who changed what, and when. Publishing decisions in particular are always attributable."
      />
      <PageBody>
        <div className="card overflow-hidden">
          {entries.length === 0 ? (
            <p className="p-6 text-[13.5px] text-muted">Nothing recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3">
                  <code
                    className={cn(
                      "shrink-0 rounded-[5px] border border-line px-1.5 py-0.5 text-[11px]",
                      entry.action.includes("publish") && "border-ink bg-ink text-white",
                      entry.action.includes("delete") && "border-danger/30 text-danger",
                    )}
                  >
                    {entry.action}
                  </code>
                  <span className="min-w-0 flex-1 text-[13.5px]">
                    {entry.summary ?? `${entry.entityType} ${entry.entityId ?? ""}`}
                  </span>
                  <span className="text-[12px] text-muted">
                    {entry.adminUser?.name ?? "System"} ·{" "}
                    {entry.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {pages > 1 ? (
          <nav className="mt-5 flex items-center justify-between" aria-label="Pagination">
            <p className="text-[13px] text-muted">
              Page {page} of {pages} · {total} entries
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={`/admin/audit?page=${page - 1}`} className="btn btn-secondary btn-sm">
                  Previous
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={`/admin/audit?page=${page + 1}`} className="btn btn-secondary btn-sm">
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
