import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getViewer, ensureVisitor } from "@/lib/leads/identity";
import { recordActivity, type ActivityType } from "@/lib/leads/activity";
import { refreshLead } from "@/lib/leads/scoring";

const TRACKABLE: ActivityType[] = [
  "unlock_requested",
  "apply_clicked",
];

const Body = z.object({
  type: z.enum(TRACKABLE as [ActivityType, ...ActivityType[]]),
  opportunityId: z.string().max(40).optional(),
  path: z.string().max(300).optional(),
  referrer: z.string().max(300).optional(),
  utm: z.record(z.string(), z.string().max(120)).optional(),
});

/**
 * Only explicit high-intent actions reach the database. Passive page views,
 * category browsing, and searches are intentionally not persisted: those
 * events are high-volume, easy for crawlers to imitate, and not worth a
 * database operation on a tightly capped deployment.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const userAgent = request.headers.get("user-agent") ?? "";
  const requestOrigin = new URL(request.url).origin;
  const looksAutomated = /bot|crawler|spider|slurp|headless|lighthouse|preview|scrap|python|curl|wget/i.test(
    userAgent,
  );

  if (
    !contentType.toLowerCase().startsWith("application/json") ||
    contentLength > 16_384 ||
    fetchSite !== "same-origin" ||
    origin !== requestOrigin ||
    looksAutomated
  ) {
    return NextResponse.json(
      { ok: false },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  let parsed;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 16_384) {
      return NextResponse.json(
        { ok: false },
        { status: 413, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    parsed = Body.safeParse(JSON.parse(rawBody));
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

  const writes: Promise<unknown>[] = [
    recordActivity({
      type: event.type,
      leadId,
      visitorId,
      opportunityId: event.opportunityId ?? null,
      metadata: { path: event.path ?? null },
    }),
    prisma.analyticsEvent
      .create({
        data: {
          eventType: event.type,
          visitorId,
          leadId,
          opportunityId: event.opportunityId ?? null,
          path: event.path ?? null,
          metadata: {},
        },
      })
      .catch(() => undefined),
  ];

  if (event.type === "apply_clicked" && event.opportunityId) {
    writes.push(
      prisma.opportunity
        .update({
          where: { id: event.opportunityId },
          data: { applyClickCount: { increment: 1 } },
        })
        .catch(() => undefined),
    );
  }

  await Promise.all(writes);

  if (leadId) {
    await prisma.lead
      .update({ where: { id: leadId }, data: { lastVisitAt: new Date() } })
      .catch(() => undefined);
    await refreshLead(leadId);
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
