import { NextResponse } from "next/server";
import type { LeadStage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth/admin";
import { audit } from "@/lib/audit";

const MAX_ROWS = 20_000;

const COLUMNS = [
  "Founder Name",
  "Startup Name",
  "Email",
  "WhatsApp",
  "Website",
  "LinkedIn",
  "Industry",
  "Stage",
  "Founder Category",
  "City",
  "State",
  "Country",
  "Funding Requirement Min",
  "Funding Requirement Max",
  "DPIIT",
  "Udyam",
  "Categories Interested In",
  "Opportunities Viewed",
  "Opportunities Saved",
  "Lead Score",
  "Profile Completion",
  "Lead Stage",
  "Lead Source",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "First Visit",
  "Last Active",
  "Email Consent",
  "WhatsApp Consent",
  "Consent Given",
];

/** Quotes every field so commas, quotes and newlines in user data stay put. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const and: Prisma.LeadWhereInput[] = [];

  if (params.get("q")) {
    const q = params.get("q")!;
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { startupName: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (params.get("stage")) and.push({ leadStage: params.get("stage") as LeadStage });
  if (params.get("state"))
    and.push({ state: { equals: params.get("state")!, mode: "insensitive" } });
  if (params.get("industry")) and.push({ industryCategoryId: params.get("industry")! });
  if (params.get("consent") === "email")
    and.push({ emailMarketingConsent: true, unsubscribedAt: null });
  if (params.get("consent") === "whatsapp")
    and.push({ whatsappMarketingConsent: true, unsubscribedAt: null });
  if (params.get("active") === "7")
    and.push({ lastActivityAt: { gte: new Date(Date.now() - 7 * 86_400_000) } });
  if (params.get("complete") === "70") and.push({ profileCompletion: { gte: 70 } });
  if (params.get("hot") === "1") and.push({ leadScore: { gte: 40 } });
  if (params.get("saved") === "1") and.push({ saved: { some: {} } });
  if (params.get("reminders") === "1")
    and.push({ subscriptions: { some: { frequency: "DEADLINE_REMINDER", active: true } } });

  const leads = await prisma.lead.findMany({
    where: and.length ? { AND: and } : {},
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: {
      industryCategory: { select: { name: true } },
      stageCategory: { select: { name: true } },
      founderTypeCategory: { select: { name: true } },
      interests: { include: { category: { select: { name: true } } } },
      _count: { select: { saved: true } },
    },
  });

  const viewCounts = await prisma.leadActivity.groupBy({
    by: ["leadId"],
    where: { type: "opportunity_view", leadId: { in: leads.map((l) => l.id) } },
    _count: { _all: true },
  });
  const viewsByLead = new Map(viewCounts.map((v) => [v.leadId, v._count._all]));

  const rows = leads.map((lead) =>
    [
      lead.name,
      lead.startupName,
      lead.email,
      lead.whatsapp,
      lead.website,
      lead.linkedinUrl,
      lead.industryCategory?.name,
      lead.stageCategory?.name,
      lead.founderTypeCategory?.name,
      lead.city,
      lead.state,
      lead.country,
      lead.fundingRequirementMin?.toString(),
      lead.fundingRequirementMax?.toString(),
      lead.dpiitStatus === null ? "" : lead.dpiitStatus ? "Yes" : "No",
      lead.udyamStatus === null ? "" : lead.udyamStatus ? "Yes" : "No",
      lead.interests.map((i) => i.category.name).join("; "),
      viewsByLead.get(lead.id) ?? 0,
      lead._count.saved,
      lead.leadScore,
      lead.profileCompletion,
      lead.leadStage,
      lead.leadSource,
      lead.utmSource,
      lead.utmMedium,
      lead.utmCampaign,
      lead.firstVisitAt.toISOString(),
      lead.lastActivityAt.toISOString(),
      lead.emailMarketingConsent && !lead.unsubscribedAt ? "Yes" : "No",
      lead.whatsappMarketingConsent && !lead.unsubscribedAt ? "Yes" : "No",
      lead.consentTimestamp?.toISOString(),
    ]
      .map(csvCell)
      .join(","),
  );

  await audit({
    adminUserId: admin.id,
    action: "lead.export",
    entityType: "Lead",
    summary: `Exported ${leads.length} leads`,
    after: { filters: Object.fromEntries(params) },
  });

  const csv = [COLUMNS.map(csvCell).join(","), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fundradar-leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
