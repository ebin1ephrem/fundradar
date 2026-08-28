"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { audit } from "@/lib/audit";

export async function resolveReportAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const report = await prisma.errorReport.findUnique({
    where: { id },
    select: { id: true, resolved: true, opportunityId: true, type: true },
  });
  if (!report || report.resolved) return;

  await prisma.errorReport.update({
    where: { id },
    data: { resolved: true, resolvedById: admin.id, resolvedAt: new Date() },
  });

  await audit({
    adminUserId: admin.id,
    action: "error_report.resolved",
    entityType: "ErrorReport",
    entityId: id,
    summary: `Marked a ${report.type.replace(/_/g, " ").toLowerCase()} report as handled`,
  });

  revalidatePath("/admin/reports");
}
