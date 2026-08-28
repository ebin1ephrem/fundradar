import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";
import { startLeadSession } from "@/lib/leads/identity";
import { recordActivity } from "@/lib/leads/activity";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/signin?error=${reason}`, request.url), 303);

  if (!token) return fail("missing");

  const row = await prisma.loginToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!row || row.usedAt || row.expiresAt < new Date()) return fail("expired");

  // Single use: burning the token before creating the session means a replayed
  // link cannot mint a second one.
  await prisma.loginToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  await startLeadSession(row.leadId);
  await prisma.lead.update({
    where: { id: row.leadId },
    data: { lastVisitAt: new Date(), lastActivityAt: new Date() },
  });
  await recordActivity({ type: "signed_in", leadId: row.leadId });

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
