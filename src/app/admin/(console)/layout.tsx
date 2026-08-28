import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/shell";
import { visibleNav } from "@/components/admin/nav";
import { prisma } from "@/lib/prisma";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const reviewQueue = await prisma.reviewItem.count({
    where: { status: { in: ["UNASSIGNED", "ASSIGNED", "UNDER_REVIEW", "READY_FOR_APPROVAL"] } },
  });

  return (
    <AdminShell
      sections={visibleNav(admin.role)}
      admin={{ name: admin.name, email: admin.email, role: admin.role }}
      badges={{ reviewQueue }}
    >
      {children}
    </AdminShell>
  );
}
