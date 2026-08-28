"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { ingest, type IngestResult } from "@/lib/ingestion";
import { canonicaliseUrl } from "@/lib/ingestion/normalise";
import { fetchPage } from "@/lib/crawler/fetch";

export type IngestState = {
  error?: string;
  /** Set when a URL could not be read, so the UI can offer the paste route. */
  offerPaste?: boolean;
  result?: Pick<IngestResult, "outcome" | "message" | "duplicates" | "missingFields"> & {
    opportunityId: string | null;
    collectionItemId: string;
  };
};

const PasteSchema = z.object({
  text: z
    .string()
    .trim()
    .min(40, "Paste a bit more — there is not enough here to work with.")
    .max(200_000, "That is too long to process in one go."),
  sourceUrl: z.string().trim().max(600).optional(),
  sourceName: z.string().trim().max(200).optional(),
});

/**
 * Method B from the spec: an admin pastes whatever they have — an email, a
 * WhatsApp forward, a circular — and it goes through the same pipeline as a
 * crawled page. The original text is kept; the result is a draft, never a
 * published record.
 */
export async function pasteTextAction(
  _prev: IngestState,
  formData: FormData,
): Promise<IngestState> {
  const admin = await requireAdmin();
  const parsed = PasteSchema.safeParse({
    text: formData.get("text"),
    sourceUrl: formData.get("sourceUrl") ?? undefined,
    sourceName: formData.get("sourceName") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check what you pasted." };
  }

  const sourceUrl = parsed.data.sourceUrl ? canonicaliseUrl(parsed.data.sourceUrl) : null;
  if (parsed.data.sourceUrl && !sourceUrl) {
    return { error: "That source URL does not look like a web address." };
  }

  const result = await ingest({
    origin: "PASTED_TEXT",
    text: parsed.data.text,
    sourceUrl,
    sourceName: parsed.data.sourceName || null,
    adminUserId: admin.id,
  });

  await audit({
    adminUserId: admin.id,
    action: "ingestion.text_pasted",
    entityType: "CollectionItem",
    entityId: result.collectionItemId,
    summary: `Pasted ${parsed.data.text.length} characters — ${result.outcome.replace(/_/g, " ").toLowerCase()}`,
  });

  revalidatePath("/admin/review");
  revalidatePath("/admin/inbox");

  return {
    result: {
      outcome: result.outcome,
      message: result.message,
      duplicates: result.duplicates,
      missingFields: result.missingFields,
      opportunityId: result.opportunityId,
      collectionItemId: result.collectionItemId,
    },
  };
}

const UrlSchema = z.object({
  url: z.string().trim().min(4, "Enter the page's address."),
});

/** Method A, one page at a time. */
export async function ingestUrlAction(
  _prev: IngestState,
  formData: FormData,
): Promise<IngestState> {
  const admin = await requireAdmin();
  const parsed = UrlSchema.safeParse({ url: formData.get("url") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a URL." };
  }

  const page = await fetchPage(parsed.data.url);
  if (!page.ok) {
    return {
      error: `We couldn't read this URL. ${page.message}`,
      offerPaste: true,
    };
  }

  if (page.text.trim().length < 150) {
    return {
      error:
        "That page had almost no readable text — it may load its content with JavaScript.",
      offerPaste: true,
    };
  }

  const result = await ingest({
    origin: "MANUAL_URL",
    text: page.text,
    url: page.url,
    sourceUrl: page.url,
    pageTitle: page.title,
    rawHtml: page.html.slice(0, 400_000),
    httpStatus: page.status,
    adminUserId: admin.id,
  });

  await audit({
    adminUserId: admin.id,
    action: "ingestion.url_added",
    entityType: "CollectionItem",
    entityId: result.collectionItemId,
    summary: `Read ${page.url} — ${result.outcome.replace(/_/g, " ").toLowerCase()}`,
  });

  revalidatePath("/admin/review");
  revalidatePath("/admin/inbox");

  return {
    result: {
      outcome: result.outcome,
      message: result.message,
      duplicates: result.duplicates,
      missingFields: result.missingFields,
      opportunityId: result.opportunityId,
      collectionItemId: result.collectionItemId,
    },
  };
}

/** Re-runs extraction on the material a draft came from. */
export async function reextractAction(formData: FormData) {
  const admin = await requireAdmin();
  const opportunityId = String(formData.get("opportunityId") ?? "");

  const item = await prisma.collectionItem.findFirst({
    where: { opportunityId },
    orderBy: { discoveredAt: "desc" },
  });

  if (!item?.rawText) {
    redirect(
      `/admin/review?error=${encodeURIComponent("There is no stored source material to re-read.")}`,
    );
  }

  const result = await ingest({
    origin: item.origin,
    text: item.rawText,
    url: item.url,
    sourceUrl: item.url,
    sourceName: item.sourceName,
    pageTitle: item.pageTitle,
    sourceId: item.sourceId,
    adminUserId: admin.id,
    existingOpportunityId: opportunityId,
    force: true,
  });

  await audit({
    adminUserId: admin.id,
    action: "ingestion.reextracted",
    entityType: "Opportunity",
    entityId: opportunityId,
    summary: `Re-read the source: ${result.message}`,
  });

  revalidatePath(`/admin/review/${opportunityId}`);
  redirect(`/admin/review/${opportunityId}?reextracted=1`);
}
