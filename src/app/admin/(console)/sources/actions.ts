"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CheckFrequency, SourceCrawlType, SourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { canonicaliseUrl } from "@/lib/ingestion/normalise";
import { drainQueue, nextCheck, queueCrawl } from "@/lib/crawler/run";
import { getRobots, isAllowed } from "@/lib/crawler/robots";

export type SourceState = { error?: string; fieldErrors?: Record<string, string> };

const paths = z
  .string()
  .trim()
  .transform((v) =>
    v
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 30),
  );

const SourceSchema = z.object({
  name: z.string().trim().min(2, "Give the source a name").max(160),
  organisation: z.string().trim().max(200).optional(),
  url: z.string().trim().min(4, "Enter the page or site address"),
  websiteUrl: z.string().trim().max(400).optional(),
  sourceType: z.nativeEnum(SourceType).default("OTHER"),
  crawlType: z.nativeEnum(SourceCrawlType).default("SINGLE_PAGE"),
  checkFrequency: z.nativeEnum(CheckFrequency).default("WEEKLY"),
  country: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  categoryId: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(4000).optional(),
  allowPaths: paths.optional(),
  ignorePaths: paths.optional(),
  maxPages: z.coerce.number().int().min(1).max(200).default(40),
  maxDepth: z.coerce.number().int().min(1).max(3).default(2),
  enabled: z.coerce.boolean().default(true),
  autoCollect: z.coerce.boolean().default(true),
  autoExtract: z.coerce.boolean().default(true),
  autoCreateReviewItems: z.coerce.boolean().default(true),
});

function readForm(formData: FormData) {
  return {
    name: formData.get("name") ?? "",
    organisation: formData.get("organisation") ?? "",
    url: formData.get("url") ?? "",
    websiteUrl: formData.get("websiteUrl") ?? "",
    sourceType: formData.get("sourceType") ?? "OTHER",
    crawlType: formData.get("crawlType") ?? "SINGLE_PAGE",
    checkFrequency: formData.get("checkFrequency") ?? "WEEKLY",
    country: formData.get("country") ?? "",
    state: formData.get("state") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    notes: formData.get("notes") ?? "",
    allowPaths: formData.get("allowPaths") ?? "",
    ignorePaths: formData.get("ignorePaths") ?? "",
    maxPages: formData.get("maxPages") ?? 40,
    maxDepth: formData.get("maxDepth") ?? 2,
    enabled: formData.get("enabled") === "on",
    autoCollect: formData.get("autoCollect") === "on",
    autoExtract: formData.get("autoExtract") === "on",
    autoCreateReviewItems: formData.get("autoCreateReviewItems") === "on",
  };
}

export async function saveSourceAction(
  _prev: SourceState,
  formData: FormData,
): Promise<SourceState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const parsed = SourceSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Check the highlighted fields.", fieldErrors };
  }

  const url = canonicaliseUrl(parsed.data.url);
  if (!url) {
    return { error: "That URL is not usable.", fieldErrors: { url: "Not a web address" } };
  }

  const data = {
    name: parsed.data.name,
    organisation: parsed.data.organisation || null,
    url,
    websiteUrl: parsed.data.websiteUrl ? canonicaliseUrl(parsed.data.websiteUrl) : new URL(url).origin,
    sourceType: parsed.data.sourceType,
    crawlType: parsed.data.crawlType,
    checkFrequency: parsed.data.checkFrequency,
    country: parsed.data.country || null,
    state: parsed.data.state || null,
    categoryId: parsed.data.categoryId || null,
    notes: parsed.data.notes || null,
    allowPaths: parsed.data.allowPaths ?? [],
    ignorePaths: parsed.data.ignorePaths ?? [],
    maxPages: parsed.data.maxPages,
    maxDepth: parsed.data.maxDepth,
    enabled: parsed.data.enabled,
    autoCollect: parsed.data.autoCollect,
    autoExtract: parsed.data.autoExtract,
    autoCreateReviewItems: parsed.data.autoCreateReviewItems,
  };

  const saved = id
    ? await prisma.source.update({ where: { id }, data })
    : await prisma.source.create({
        data: {
          ...data,
          createdById: admin.id,
          nextCheckAt: nextCheck(data.checkFrequency, new Date()),
        },
      });

  await audit({
    adminUserId: admin.id,
    action: id ? "source.update" : "source.create",
    entityType: "Source",
    entityId: saved.id,
    summary: `${id ? "Updated" : "Added"} source "${saved.name}"`,
    after: { url: saved.url, crawlType: saved.crawlType },
  });

  revalidatePath("/admin/sources");
  redirect(`/admin/sources/${saved.id}?saved=1`);
}

/** Checks robots.txt before an admin commits to monitoring a site. */
export async function checkRobotsAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return;

  const url = new URL(source.url);
  const robots = await getRobots(url.origin);
  const allowed = robots.unavailable || isAllowed(robots, url.pathname);

  await prisma.source.update({
    where: { id },
    data: {
      robotsAllowed: allowed,
      robotsCheckedAt: new Date(),
      health: allowed ? source.health : "MANUAL_MONITORING_REQUIRED",
      autoCollect: allowed ? source.autoCollect : false,
      lastError: allowed ? null : "This site's robots.txt asks crawlers not to read this page.",
    },
  });

  await audit({
    adminUserId: admin.id,
    action: "source.robots_checked",
    entityType: "Source",
    entityId: id,
    summary: allowed
      ? `robots.txt allows crawling ${source.url}`
      : `robots.txt disallows ${source.url} — switched to manual monitoring`,
  });

  revalidatePath(`/admin/sources/${id}`);
}

export async function toggleSourceAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return;

  const updated = await prisma.source.update({
    where: { id },
    data: { enabled: !source.enabled },
  });

  await audit({
    adminUserId: admin.id,
    action: updated.enabled ? "source.enabled" : "source.disabled",
    entityType: "Source",
    entityId: id,
    summary: `${updated.enabled ? "Enabled" : "Paused"} "${updated.name}"`,
  });

  revalidatePath("/admin/sources");
  revalidatePath(`/admin/sources/${id}`);
}

/**
 * Queues a crawl and runs the queue inline so the admin sees a result rather
 * than a job that might run later.
 */
export async function runSourceNowAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return;
  if (!source.autoCollect) {
    redirect(
      `/admin/sources/${id}?error=${encodeURIComponent(
        "Automated collection is off for this source. Paste the text instead.",
      )}`,
    );
  }

  await queueCrawl(id, admin.id);
  await drainQueue(1);

  revalidatePath("/admin/sources");
  revalidatePath(`/admin/sources/${id}`);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/review");
  redirect(`/admin/sources/${id}?ran=1`);
}

const BulkSchema = z.object({
  urls: z.string().trim().min(4, "Add at least one URL"),
  sourceType: z.nativeEnum(SourceType).default("OTHER"),
  crawlType: z.nativeEnum(SourceCrawlType).default("SINGLE_PAGE"),
  checkFrequency: z.nativeEnum(CheckFrequency).default("WEEKLY"),
});

/** One URL per line becomes one monitored source. */
export async function bulkAddSourcesAction(
  _prev: SourceState,
  formData: FormData,
): Promise<SourceState> {
  const admin = await requireAdmin();
  const parsed = BulkSchema.safeParse({
    urls: formData.get("urls"),
    sourceType: formData.get("sourceType") ?? "OTHER",
    crawlType: formData.get("crawlType") ?? "SINGLE_PAGE",
    checkFrequency: formData.get("checkFrequency") ?? "WEEKLY",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Add at least one URL." };
  }

  const lines = parsed.data.urls
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 200);

  let created = 0;
  const skipped: string[] = [];

  for (const line of lines) {
    const url = canonicaliseUrl(line);
    if (!url) {
      skipped.push(line);
      continue;
    }
    const exists = await prisma.source.findFirst({ where: { url }, select: { id: true } });
    if (exists) {
      skipped.push(`${line} (already monitored)`);
      continue;
    }

    const host = new URL(url).hostname.replace(/^www\./, "");
    await prisma.source.create({
      data: {
        name: host,
        url,
        websiteUrl: new URL(url).origin,
        sourceType: parsed.data.sourceType,
        crawlType: parsed.data.crawlType,
        checkFrequency: parsed.data.checkFrequency,
        createdById: admin.id,
        nextCheckAt: nextCheck(parsed.data.checkFrequency, new Date()),
      },
    });
    created += 1;
  }

  await audit({
    adminUserId: admin.id,
    action: "source.bulk_create",
    entityType: "Source",
    summary: `Added ${created} source${created === 1 ? "" : "s"}${skipped.length ? `, skipped ${skipped.length}` : ""}`,
  });

  revalidatePath("/admin/sources");
  if (created === 0) {
    return { error: `Nothing was added. ${skipped.slice(0, 3).join("; ")}` };
  }
  redirect(`/admin/sources?added=${created}&skipped=${skipped.length}`);
}
