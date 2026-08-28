import "server-only";
import type { CrawlJob, Source } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ingest } from "@/lib/ingestion";
import { fetchPage, politeDelay } from "./fetch";
import { getRobots } from "./robots";
import { rankLinks } from "./discover";

const DEFAULT_DELAY_MS = 1200;
/** Keeps one job inside a serverless invocation's budget. */
const TIME_BUDGET_MS = 45_000;
const MIN_SCORE = 0.25;

export type JobSummary = {
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
  pagesFound: number;
  pagesProcessed: number;
  pagesSkipped: number;
  opportunitiesFound: number;
  changesFound: number;
  error: string | null;
  notes: string[];
};

/**
 * Runs one crawl job to completion or to its time budget, whichever comes
 * first. Nothing here can publish — every page it reads goes through the same
 * ingestion pipeline as pasted text, and comes out as a draft or an inbox item.
 */
export async function runCrawlJob(job: CrawlJob & { source: Source | null }): Promise<JobSummary> {
  const source = job.source;
  const summary: JobSummary = {
    status: "SUCCEEDED",
    pagesFound: 0,
    pagesProcessed: 0,
    pagesSkipped: 0,
    opportunitiesFound: 0,
    changesFound: 0,
    error: null,
    notes: [],
  };

  if (!source) {
    return { ...summary, status: "FAILED", error: "The source no longer exists." };
  }

  const deadline = Date.now() + TIME_BUDGET_MS;
  const startUrl = source.url;

  await prisma.crawlJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    const origin = new URL(startUrl).origin;
    const robots = await getRobots(origin);
    const delay = robots.crawlDelayMs ?? DEFAULT_DELAY_MS;

    await prisma.source.update({
      where: { id: source.id },
      data: {
        robotsAllowed: !robots.unavailable,
        robotsCheckedAt: new Date(),
      },
    });

    const targets = await collectTargets(source, startUrl, summary, delay, deadline);
    summary.pagesFound = targets.length;

    for (const target of targets) {
      if (Date.now() > deadline) {
        summary.status = "PARTIAL";
        summary.notes.push("Stopped at the time budget — the rest will be picked up next run.");
        break;
      }

      const page = await fetchPage(target);
      await politeDelay(delay);

      if (!page.ok) {
        summary.pagesSkipped += 1;
        summary.notes.push(`${target}: ${page.message}`);
        if (page.reason === "LOGIN_REQUIRED" || page.reason === "ROBOTS") {
          await markManualReview(source.id, page.message);
        }
        continue;
      }

      if (page.text.trim().length < 200) {
        summary.pagesSkipped += 1;
        summary.notes.push(`${target}: too little readable text.`);
        continue;
      }

      // A page we already turned into an opportunity is checked for changes,
      // not ingested again as something new.
      const existing = await prisma.collectionItem.findFirst({
        where: { url: page.url, sourceId: source.id, opportunityId: { not: null } },
        select: { opportunityId: true },
      });

      const result = await ingest({
        origin: "CRAWLER",
        text: page.text,
        url: page.url,
        sourceUrl: page.url,
        sourceName: source.organisation ?? source.name,
        pageTitle: page.title,
        httpStatus: page.status,
        sourceId: source.id,
        crawlJobId: job.id,
        adminUserId: job.createdById,
        existingOpportunityId: existing?.opportunityId ?? null,
      });

      summary.pagesProcessed += 1;
      if (result.outcome === "DRAFT_CREATED") summary.opportunitiesFound += 1;
      if (result.outcome === "UPDATE_PROPOSED") summary.changesFound += 1;
    }

    if (summary.pagesProcessed === 0 && summary.pagesSkipped > 0) {
      summary.status = "PARTIAL";
    }
  } catch (error) {
    summary.status = "FAILED";
    summary.error = error instanceof Error ? error.message : "The crawl failed.";
  }

  await finishJob(job, source, summary);
  return summary;
}

async function collectTargets(
  source: Source,
  startUrl: string,
  summary: JobSummary,
  delay: number,
  deadline: number,
): Promise<string[]> {
  if (source.crawlType === "SINGLE_PAGE") return [startUrl];

  const page = await fetchPage(startUrl);
  await politeDelay(delay);

  if (!page.ok) {
    summary.notes.push(`${startUrl}: ${page.message}`);
    if (page.reason === "LOGIN_REQUIRED" || page.reason === "ROBOTS") {
      await markManualReview(source.id, page.message);
    }
    return [];
  }

  const ranked = rankLinks(page.links, {
    baseUrl: startUrl,
    sameHostOnly: true,
    allowPaths: source.allowPaths,
    ignorePaths: source.ignorePaths,
  }).filter((c) => c.score >= MIN_SCORE);

  const targets = ranked.slice(0, source.maxPages).map((c) => c.url);

  // A domain crawl looks one level deeper through section pages.
  if (source.crawlType === "DOMAIN" && source.maxDepth > 1 && Date.now() < deadline) {
    const sections = ranked
      .filter((c) => c.score >= 0.5)
      .slice(0, 3)
      .map((c) => c.url);

    for (const section of sections) {
      if (Date.now() > deadline || targets.length >= source.maxPages) break;
      const sub = await fetchPage(section);
      await politeDelay(delay);
      if (!sub.ok) continue;
      const deeper = rankLinks(sub.links, {
        baseUrl: startUrl,
        sameHostOnly: true,
        allowPaths: source.allowPaths,
        ignorePaths: source.ignorePaths,
      }).filter((c) => c.score >= MIN_SCORE);
      for (const candidate of deeper) {
        if (targets.length >= source.maxPages) break;
        if (!targets.includes(candidate.url)) targets.push(candidate.url);
      }
    }
  }

  // The listing page itself is worth reading when it holds the whole notice.
  if (source.crawlType === "LISTING_PAGE" && targets.length === 0) {
    summary.notes.push(
      "No links on this page looked like funding opportunities, so the page itself was read instead. If that is wrong, check the allowed paths.",
    );
    targets.push(startUrl);
  }

  return targets;
}

async function markManualReview(sourceId: string, reason: string): Promise<void> {
  await prisma.source.update({
    where: { id: sourceId },
    data: {
      health: "MANUAL_MONITORING_REQUIRED",
      lastError: reason,
      // Automated collection is switched off rather than repeatedly refused.
      autoCollect: false,
    },
  });
}

async function finishJob(job: CrawlJob, source: Source, summary: JobSummary): Promise<void> {
  const now = new Date();
  const succeeded = summary.status !== "FAILED";

  await prisma.crawlJob.update({
    where: { id: job.id },
    data: {
      status: summary.status,
      finishedAt: now,
      pagesFound: summary.pagesFound,
      pagesProcessed: summary.pagesProcessed,
      pagesSkipped: summary.pagesSkipped,
      opportunitiesFound: summary.opportunitiesFound,
      changesFound: summary.changesFound,
      error: summary.error,
      result: { notes: summary.notes.slice(0, 40) },
    },
  });

  const current = await prisma.source.findUnique({ where: { id: source.id } });
  const health =
    current?.health === "MANUAL_MONITORING_REQUIRED"
      ? "MANUAL_MONITORING_REQUIRED"
      : summary.status === "FAILED"
        ? "ERROR"
        : summary.status === "PARTIAL"
          ? "STALE"
          : "HEALTHY";

  await prisma.source.update({
    where: { id: source.id },
    data: {
      health,
      lastCheckedAt: now,
      lastSuccessfulCheckAt: succeeded ? now : source.lastSuccessfulCheckAt,
      lastChangeDetectedAt:
        summary.opportunitiesFound + summary.changesFound > 0 ? now : source.lastChangeDetectedAt,
      errorCount: succeeded ? 0 : source.errorCount + 1,
      lastError: summary.error,
      nextCheckAt: nextCheck(source.checkFrequency, now),
    },
  });

  await audit({
    adminUserId: job.createdById,
    action: "crawler.job_finished",
    entityType: "Source",
    entityId: source.id,
    summary: `Crawl of "${source.name}" ${summary.status.toLowerCase()}: ${summary.pagesProcessed} read, ${summary.opportunitiesFound} new, ${summary.changesFound} changed`,
    after: { ...summary, notes: undefined },
  });
}

const FREQUENCY_DAYS: Record<Source["checkFrequency"], number | null> = {
  DAILY: 1,
  EVERY_3_DAYS: 3,
  WEEKLY: 7,
  FORTNIGHTLY: 14,
  MONTHLY: 30,
  MANUAL: null,
};

export function nextCheck(frequency: Source["checkFrequency"], from: Date): Date | null {
  const days = FREQUENCY_DAYS[frequency];
  if (days === null) return null;
  return new Date(from.getTime() + days * 86_400_000);
}

/** Queues a job. The runner is invoked by cron or by the admin's "run now". */
export async function queueCrawl(
  sourceId: string,
  adminUserId: string | null,
  type: "SOURCE_DISCOVER" | "SOURCE_FETCH" = "SOURCE_FETCH",
): Promise<string> {
  const existing = await prisma.crawlJob.findFirst({
    where: { sourceId, status: { in: ["QUEUED", "RUNNING"] } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const job = await prisma.crawlJob.create({
    data: { sourceId, type, status: "QUEUED", createdById: adminUserId },
  });
  return job.id;
}

/**
 * Drains the queue. Called by the cron endpoint and by "run now"; bounded so a
 * serverless invocation always returns.
 */
export async function drainQueue(limit = 3): Promise<{ ran: number; summaries: JobSummary[] }> {
  const jobs = await prisma.crawlJob.findMany({
    where: { status: "QUEUED", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    take: limit,
    include: { source: true },
  });

  const summaries: JobSummary[] = [];
  for (const job of jobs) {
    summaries.push(await runCrawlJob(job));
  }

  return { ran: jobs.length, summaries };
}
