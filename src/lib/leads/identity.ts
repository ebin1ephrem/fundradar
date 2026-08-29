import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { Lead, Visitor } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashToken, newToken } from "@/lib/auth/tokens";
import { LEAD_COOKIE, VISITOR_COOKIE } from "@/lib/auth/cookie-names";

const LEAD_SESSION_DAYS = 180;

export type Viewer = {
  visitorId: string | null;
  anonId: string | null;
  lead: Lead | null;
};

/**
 * Resolves who is browsing, without ever forcing anyone to identify themselves.
 * The anonymous id is minted by middleware on the first request; the Visitor row
 * is only written once there is something to record about them.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const store = await cookies();
  const anonId = store.get(VISITOR_COOKIE)?.value ?? null;
  const leadToken = store.get(LEAD_COOKIE)?.value ?? null;

  let lead: Lead | null = null;
  if (leadToken) {
    const session = await prisma.leadSession.findUnique({
      where: { tokenHash: hashToken(leadToken) },
      include: { lead: true },
    });
    if (session && session.expiresAt > new Date()) lead = session.lead;
  }

  // Anonymous page renders do not need a database lookup. The tracking
  // endpoint creates/resolves the Visitor row only when it records an event.
  // This removes one Prisma operation from every anonymous public page view.
  return { visitorId: null, anonId, lead };
});

/** True once someone has given their details — used to stop re-prompting. */
export async function isIdentified(): Promise<boolean> {
  return (await getViewer()).lead !== null;
}

/**
 * Creates the Visitor row on demand, carrying whatever attribution the first
 * request had. Called from the tracking endpoint, not from page renders.
 */
export async function ensureVisitor(attribution?: {
  landingPath?: string | null;
  referrer?: string | null;
  utm?: Record<string, string | null>;
}): Promise<Visitor | null> {
  const store = await cookies();
  const anonId = store.get(VISITOR_COOKIE)?.value;
  if (!anonId) return null;

  const hdrs = await headers();
  const now = new Date();

  return prisma.visitor.upsert({
    where: { anonId },
    update: { lastSeenAt: now },
    create: {
      anonId,
      firstSeenAt: now,
      lastSeenAt: now,
      landingPath: attribution?.landingPath ?? null,
      referrer: attribution?.referrer ?? null,
      utmSource: attribution?.utm?.utm_source ?? null,
      utmMedium: attribution?.utm?.utm_medium ?? null,
      utmCampaign: attribution?.utm?.utm_campaign ?? null,
      utmTerm: attribution?.utm?.utm_term ?? null,
      utmContent: attribution?.utm?.utm_content ?? null,
      userAgent: hdrs.get("user-agent")?.slice(0, 500) ?? null,
    },
  });
}

export async function startLeadSession(leadId: string): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + LEAD_SESSION_DAYS * 86_400_000);
  const hdrs = await headers();

  await prisma.leadSession.create({
    data: {
      leadId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: hdrs.get("user-agent")?.slice(0, 500) ?? null,
    },
  });

  const store = await cookies();
  store.set(LEAD_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endLeadSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(LEAD_COOKIE)?.value;
  if (token) {
    await prisma.leadSession
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  store.delete(LEAD_COOKIE);
}

/** Attaches everything the anonymous visitor did to the lead they became. */
export async function linkVisitorToLead(
  anonId: string | null,
  leadId: string,
): Promise<void> {
  if (!anonId) return;
  const visitor = await prisma.visitor.findUnique({ where: { anonId } });
  if (!visitor) return;

  await prisma.$transaction([
    prisma.visitor.update({ where: { id: visitor.id }, data: { leadId } }),
    prisma.leadActivity.updateMany({
      where: { visitorId: visitor.id, leadId: null },
      data: { leadId },
    }),
    prisma.analyticsEvent.updateMany({
      where: { visitorId: visitor.id, leadId: null },
      data: { leadId },
    }),
  ]);
}

export async function requireLead(): Promise<Lead> {
  const { lead } = await getViewer();
  if (!lead) throw new Error("Not identified");
  return lead;
}

/** Which opportunities the current viewer has saved, for card state. */
export async function savedOpportunityIds(): Promise<Set<string>> {
  const { lead } = await getViewer();
  if (!lead) return new Set();
  const rows = await prisma.savedOpportunity.findMany({
    where: { leadId: lead.id },
    select: { opportunityId: true },
  });
  return new Set(rows.map((r) => r.opportunityId));
}
