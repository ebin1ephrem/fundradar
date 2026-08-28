import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewer, ensureVisitor } from "@/lib/leads/identity";
import { recordActivity, noteInterest, type ActivityType } from "@/lib/leads/activity";
import { refreshLead } from "@/lib/leads/scoring";

const TRACKABLE: ActivityType[] = [
  "arrived",
  "opportunity_view",
  "category_view",
  "search",
  "unlock_requested",
  "apply_clicked",
];

const Body = z.object({
  type: z.enum(TRACKABLE as [ActivityType, ...ActivityType[]]),
  opportunityId: z.string().max(40).optional(),
  categoryId: z.string().max(40).optional(),
  categoryIds: z.array(z.string().max(40)).max(12).optional(),
  path: z.string().max(300).optional(),
  query: z.string().max(160).optional(),
  referrer: z.string().max(300).optional(),
  utm: z.record(z.string(), z.string().max(120)).optional(),
});

/**
 * Behavioural tracking runs from the browser rather than during render: Next
 * prefetches links on hover, and counting those as views would inflate every
 * number on the platform.
 */
export async function POST(request: Request) {
  let parsed;
  try {
    parsed = Body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const event = parsed.data;
  const viewer = await getViewer();
  const visitor = await ensureVisitor({
    landingPath: event.path ?? null,
    referrer: event.referrer ?? null,
    utm: event.utm ?? {},
  });

  const visitorId = visitor?.id ?? viewer.visitorId;
  const leadId = viewer.lead?.id ?? null;
  if (!visitorId && !leadId) return NextResponse.json({ ok: true });

  await recordActivity({
    type: event.type,
    leadId,
    visitorId,
    opportunityId: event.opportunityId ?? null,
    categoryId: event.categoryId ?? null,
    description: event.query ? `Searched for "${event.query}"` : undefined,
    metadata: { path: event.path ?? null, query: event.query ?? null },
  });

  await prisma.analyticsEvent
    .create({
      data: {
        eventType: event.type,
        visitorId,
        leadId,
        opportunityId: event.opportunityId ?? null,
        categoryId: event.categoryId ?? null,
        path: event.path ?? null,
        metadata: { query: event.query ?? null },
      },
    })
    .catch(() => undefined);

  if (event.type === "opportunity_view" && event.opportunityId) {
    await prisma.opportunity
      .update({
        where: { id: event.opportunityId },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => undefined);
  }

  if (event.type === "apply_clicked" && event.opportunityId) {
    await prisma.opportunity
      .update({
        where: { id: event.opportunityId },
        data: { applyClickCount: { increment: 1 } },
      })
      .catch(() => undefined);
  }

  const interestIds = [
    ...(event.categoryIds ?? []),
    ...(event.categoryId ? [event.categoryId] : []),
  ];
  if (leadId && interestIds.length) {
    await noteInterest(leadId, interestIds, event.type);
  }

  if (leadId) {
    await prisma.lead
      .update({ where: { id: leadId }, data: { lastVisitAt: new Date() } })
      .catch(() => undefined);
    await refreshLead(leadId);
  }

  return NextResponse.json({ ok: true });
}
