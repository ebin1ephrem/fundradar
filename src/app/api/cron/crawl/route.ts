import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { drainQueue, queueCrawl } from "@/lib/crawler/run";

/** Vercel's hobby plan caps this at 60s; Pro allows more. */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Queues any source that is due, then drains a couple of jobs.
 *
 * Deliberately bounded: a serverless invocation must return, so a large backlog
 * is worked through across several firings rather than in one long run.
 */
export async function GET(request: Request) {
  const authorised = isAuthorised(request);
  if (!authorised) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const due = await prisma.source.findMany({
    where: {
      enabled: true,
      autoCollect: true,
      health: { not: "MANUAL_MONITORING_REQUIRED" },
      checkFrequency: { not: "MANUAL" },
      OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: new Date() } }],
    },
    select: { id: true },
    take: 20,
  });

  for (const source of due) {
    await queueCrawl(source.id, null);
  }

  const { ran, summaries } = await drainQueue(2);

  return NextResponse.json({
    queued: due.length,
    ran,
    drafts: summaries.reduce((sum, s) => sum + s.opportunitiesFound, 0),
    changes: summaries.reduce((sum, s) => sum + s.changesFound, 0),
    // Nothing here can publish. The numbers above are review items, not
    // public records.
    published: 0,
  });
}

function isAuthorised(request: Request): boolean {
  // Vercel Cron sends this header on scheduled invocations.
  const header = request.headers.get("authorization");
  if (env.cronSecret) return header === `Bearer ${env.cronSecret}`;
  // Without a configured secret, only allow it outside production so a
  // misconfigured deployment cannot expose the crawler.
  return env.nodeEnv !== "production";
}
