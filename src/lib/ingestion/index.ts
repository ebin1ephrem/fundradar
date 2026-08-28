import "server-only";
import { createHash } from "crypto";
import type {
  CollectionClassification,
  ExtractionInputType,
  IngestionMethod,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import {
  runExtraction,
  type ExtractionInput,
  type ExtractionOutcome,
} from "@/lib/ai";
import {
  IMPORTANT_FIELDS,
  FIELD_LABEL,
  type ExtractionField,
} from "@/lib/ai/schema";
import { slugify, uniqueSlug } from "@/lib/utils";
import { normaliseExtraction, canonicaliseUrl } from "./normalise";
import { findDuplicates, fingerprint } from "./duplicates";
import { detectChanges } from "./changes";

export type IngestRequest = {
  origin: IngestionMethod;
  text: string;
  url?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  pageTitle?: string | null;
  rawHtml?: string | null;
  httpStatus?: number | null;
  sourceId?: string | null;
  crawlJobId?: string | null;
  adminUserId?: string | null;
  /** Set when re-crawling a page that already produced an opportunity. */
  existingOpportunityId?: string | null;
  /** Admin "re-extract" — runs the model even when the content is unchanged. */
  force?: boolean;
};

export type IngestResult = {
  collectionItemId: string;
  extractionRunId: string;
  opportunityId: string | null;
  reviewItemId: string | null;
  classification: CollectionClassification;
  classificationConfidence: number;
  outcome:
    | "DRAFT_CREATED"
    | "UPDATE_PROPOSED"
    | "UNCHANGED"
    | "PARKED"
    | "REJECTED_BEFORE";
  duplicates: number;
  missingFields: { field: string; label: string }[];
  message: string;
};

const INPUT_TYPE: Record<IngestionMethod, ExtractionInputType> = {
  PASTED_TEXT: "PASTED_TEXT",
  MANUAL_URL: "URL",
  CRAWLER: "CRAWLED_PAGE",
  CSV_IMPORT: "URL",
  MANUAL_ENTRY: "MANUAL_REEXTRACTION",
};

/**
 * Material classified as any of these does not become a draft. It is kept in
 * the collection inbox where an admin can look at it — parked, never deleted.
 *
 * UNKNOWN is on the list deliberately. A draft that nobody can tell is an
 * opportunity costs a reviewer more time than the inbox row does.
 */
const NOT_DRAFTABLE: CollectionClassification[] = [
  "NOT_AN_OPPORTUNITY",
  "NEWS_OR_ARTICLE",
  "EVENT",
  "GENERAL_INFORMATION",
  "UNKNOWN",
];

export function hashContent(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex");
}

/**
 * The one ingestion path.
 *
 * Pasted text, a single URL and a crawled page all arrive here and go through
 * the same steps: keep the original, extract, normalise, suggest categories,
 * check for duplicates, then create a draft that a person has to approve.
 * There is deliberately no branch that reaches PUBLISHED.
 */
export async function ingest(request: IngestRequest): Promise<IngestResult> {
  const contentHash = hashContent(request.text);
  const canonical = request.url ? canonicaliseUrl(request.url) : null;

  // Material an admin already rejected does not come back.
  const rejected = await prisma.rejectedItem.findFirst({
    where: {
      OR: [
        ...(canonical ? [{ url: canonical }] : []),
        { fingerprint: contentHash },
      ],
    },
  });
  if (rejected && request.origin === "CRAWLER") {
    return parkedResult(
      await storeCollectionItem(request, contentHash, canonical, "IGNORED"),
      "REJECTED_BEFORE",
      `Skipped: an admin rejected this before (${rejected.reason.replace(/_/g, " ").toLowerCase()}).`,
    );
  }

  // Cost control: identical bytes never reach the model twice. A re-crawl of an
  // unchanged page is a hash comparison, not an extraction. The admin's
  // "re-extract" button sets `force` to bypass this.
  if (!request.force && request.origin === "CRAWLER" && request.url) {
    const previous = await prisma.collectionItem.findFirst({
      where: {
        url: request.url,
        ...(request.sourceId ? { sourceId: request.sourceId } : {}),
      },
      orderBy: { discoveredAt: "desc" },
      select: { id: true, contentHash: true, status: true, opportunityId: true },
    });

    if (
      previous &&
      previous.contentHash === contentHash &&
      (previous.status === "EXTRACTED" || previous.status === "PROMOTED")
    ) {
      await prisma.collectionItem.update({
        where: { id: previous.id },
        data: { lastCheckedAt: new Date(), fetchedAt: new Date() },
      });
      if (previous.opportunityId) {
        await prisma.opportunity.update({
          where: { id: previous.opportunityId },
          data: { lastCheckedAt: new Date() },
        });
      }
      await recordSnapshot(request, contentHash);

      return {
        collectionItemId: previous.id,
        extractionRunId: "",
        opportunityId: previous.opportunityId,
        reviewItemId: null,
        classification: "UNKNOWN",
        classificationConfidence: 0,
        outcome: "UNCHANGED",
        duplicates: 0,
        missingFields: [],
        message: "The page has not changed since we last read it.",
      };
    }
  }

  const item = await storeCollectionItem(
    request,
    contentHash,
    canonical,
    "EXTRACTING",
  );
  await recordSnapshot(request, contentHash);

  // -- Extract ------------------------------------------------------------
  const categories = await activeCategories();
  const input: ExtractionInput = {
    text: request.text,
    sourceUrl: request.sourceUrl ?? request.url ?? null,
    sourceName: request.sourceName ?? null,
    pageTitle: request.pageTitle ?? null,
    categories,
  };

  const started = new Date();
  let outcome: ExtractionOutcome;
  let extractionError: string | null = null;
  try {
    const result = await runExtraction(input);
    outcome = result.outcome;
    extractionError = result.error;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Extraction failed";
    const run = await prisma.extractionRun.create({
      data: {
        inputType: INPUT_TYPE[request.origin],
        inputReference: request.url ?? null,
        status: "FAILED",
        provider: "unknown",
        startedAt: started,
        completedAt: new Date(),
        error: message,
        collectionItemId: item.id,
        createdById: request.adminUserId ?? null,
      },
    });
    await prisma.collectionItem.update({
      where: { id: item.id },
      data: { status: "FAILED", extractionError: message },
    });
    return {
      collectionItemId: item.id,
      extractionRunId: run.id,
      opportunityId: null,
      reviewItemId: null,
      classification: "UNKNOWN",
      classificationConfidence: 0,
      outcome: "PARKED",
      duplicates: 0,
      missingFields: [],
      message: `We could not read this. ${message}`,
    };
  }

  const { draft, rejected: rejectedValues } = normaliseExtraction(outcome);
  const classification = outcome.classification
    .kind as CollectionClassification;

  const run = await prisma.extractionRun.create({
    data: {
      inputType: INPUT_TYPE[request.origin],
      inputReference: request.url ?? null,
      status: "SUCCEEDED",
      provider: outcome.provider,
      model: outcome.model,
      promptVersion: outcome.promptVersion,
      startedAt: started,
      completedAt: new Date(),
      classification,
      classificationConfidence: outcome.classification.confidence,
      classificationReason: outcome.classification.reason,
      overallConfidence: averageConfidence(outcome),
      structuredResult: outcome as unknown as Prisma.InputJsonValue,
      error: extractionError,
      tokensIn: outcome.tokensIn ?? null,
      tokensOut: outcome.tokensOut ?? null,
      collectionItemId: item.id,
      opportunityId: request.existingOpportunityId ?? null,
      createdById: request.adminUserId ?? null,
      fields: {
        create: [
          ...outcome.fields.map((field) => ({
            field: field.name,
            value: field.value,
            confidence: field.confidence,
            evidence: field.evidence || null,
            sourceReference: request.url ?? request.origin,
            isUnknown: false,
          })),
          ...outcome.unknownFields
            .filter((f) => !outcome.fields.some((v) => v.name === f))
            .map((field) => ({
              field,
              value: null,
              confidence: null,
              evidence: null,
              sourceReference: request.url ?? request.origin,
              isUnknown: true,
            })),
        ],
      },
    },
  });

  if (rejectedValues.length) {
    await prisma.extractionRun.update({
      where: { id: run.id },
      data: {
        error: [
          extractionError,
          `Dropped unusable values: ${rejectedValues
            .map((r) => `${r.field} (${r.reason})`)
            .join(", ")}`,
        ]
          .filter(Boolean)
          .join(" · "),
      },
    });
  }

  const missingFields = missingImportantFields(outcome);

  // -- Material that is not an opportunity stays in the inbox -------------
  if (NOT_DRAFTABLE.includes(classification) || !draft.title) {
    await prisma.collectionItem.update({
      where: { id: item.id },
      data: {
        status: "EXTRACTED",
        classification,
        classificationConfidence: outcome.classification.confidence,
        classificationReason: outcome.classification.reason,
        extractedData: outcome as unknown as Prisma.InputJsonValue,
        extractedAt: new Date(),
        pageTitle:
          request.pageTitle ?? (draft.title as string | undefined) ?? null,
      },
    });

    return {
      collectionItemId: item.id,
      extractionRunId: run.id,
      opportunityId: null,
      reviewItemId: null,
      classification,
      classificationConfidence: outcome.classification.confidence,
      outcome: "PARKED",
      duplicates: 0,
      missingFields,
      message:
        draft.title && classification !== "UNKNOWN"
          ? `Read as ${classification.replace(/_/g, " ").toLowerCase()}, so it is waiting in the collection inbox rather than becoming a draft.`
          : "We could not confidently identify an opportunity. It has been saved for manual review.",
    };
  }

  // -- A page we have seen before: propose an update, never apply one -----
  if (request.existingOpportunityId) {
    return updateExisting(
      request,
      item.id,
      run.id,
      outcome,
      draft,
      classification,
      missingFields,
    );
  }

  // -- New draft ----------------------------------------------------------
  return createDraft(
    request,
    item.id,
    run.id,
    outcome,
    draft,
    classification,
    missingFields,
  );
}

/** Content history per URL, used for change detection and for the audit trail. */
async function recordSnapshot(request: IngestRequest, contentHash: string): Promise<void> {
  if (!request.url) return;
  await prisma.sourceSnapshot
    .create({
      data: {
        sourceId: request.sourceId ?? null,
        url: request.url,
        contentHash,
        httpStatus: request.httpStatus ?? null,
        title: request.pageTitle ?? null,
        textLength: request.text.length,
        crawlJobId: request.crawlJobId ?? null,
      },
    })
    .catch(() => undefined);
}

async function storeCollectionItem(
  request: IngestRequest,
  contentHash: string,
  canonical: string | null,
  status: "EXTRACTING" | "IGNORED",
) {
  const data = {
    sourceId: request.sourceId ?? null,
    origin: request.origin,
    url: request.url ?? null,
    canonicalUrl: canonical,
    pageTitle: request.pageTitle ?? null,
    rawText: request.text,
    rawHtml: request.rawHtml ?? null,
    contentHash,
    httpStatus: request.httpStatus ?? null,
    sourceName: request.sourceName ?? null,
    createdById: request.adminUserId ?? null,
    status,
    fetchedAt: new Date(),
  };

  // A monitored source revisiting the same URL updates its row; pasted text is
  // always a new item, because the same text pasted twice is two events.
  if (request.sourceId && request.url) {
    return prisma.collectionItem.upsert({
      where: { sourceId_url: { sourceId: request.sourceId, url: request.url } },
      update: data,
      create: data,
    });
  }
  return prisma.collectionItem.create({ data });
}

async function createDraft(
  request: IngestRequest,
  collectionItemId: string,
  extractionRunId: string,
  outcome: ExtractionOutcome,
  draft: Record<string, unknown>,
  classification: CollectionClassification,
  missingFields: { field: string; label: string }[],
): Promise<IngestResult> {
  const title = String(draft.title);
  const slug = await uniqueSlug(title, async (candidate) =>
    Boolean(
      await prisma.opportunity.findUnique({
        where: { slug: candidate },
        select: { id: true },
      }),
    ),
  );

  const sourceUrl =
    (draft.officialSourceUrl as string | undefined) ??
    request.sourceUrl ??
    request.url ??
    null;

  const data: Prisma.OpportunityUncheckedCreateInput = {
    ...(draft as Partial<Prisma.OpportunityUncheckedCreateInput>),
    title,
    slug,
    providerName:
      (draft.providerName as string | undefined) ?? "Not specified by provider",
    shortDescription:
      (draft.shortDescription as string | undefined) ??
      `${title}. Details were not stated in the source material — please review.`,
    // Required by the schema, but a missing source is exactly what the
    // publication gate refuses on, so an empty string here cannot go public.
    officialSourceUrl: sourceUrl ?? "",
    originalSourceUrl: request.url ?? request.sourceUrl ?? null,
    sourceWebsite: hostOf(request.url ?? request.sourceUrl),
    sourceId: request.sourceId ?? null,
    ingestionMethod: request.origin,
    workflowStatus: "PENDING_REVIEW",
    verificationStatus: "AUTO_EXTRACTED",
    isActive: false,
    sourceConfidence: averageConfidence(outcome),
    fieldConfidence: confidenceMap(outcome) as Prisma.InputJsonValue,
    extractionDate: new Date(),
    lastCheckedAt: new Date(),
    createdById: request.adminUserId ?? null,
  };

  const opportunity = await prisma.opportunity.create({ data });

  await prisma.$transaction([
    prisma.collectionItem.update({
      where: { id: collectionItemId },
      data: {
        status: "PROMOTED",
        classification,
        classificationConfidence: outcome.classification.confidence,
        classificationReason: outcome.classification.reason,
        extractedData: outcome as unknown as Prisma.InputJsonValue,
        extractedAt: new Date(),
        opportunityId: opportunity.id,
        pageTitle: request.pageTitle ?? title,
      },
    }),
    prisma.extractionRun.update({
      where: { id: extractionRunId },
      data: { opportunityId: opportunity.id },
    }),
  ]);

  await saveSuggestions(outcome, opportunity.id, collectionItemId);

  const duplicates = await recordDuplicates(opportunity.id, {
    title,
    providerName: draft.providerName as string | undefined,
    applicationUrl: draft.applicationUrl as string | undefined,
    officialSourceUrl: sourceUrl,
    applicationDeadline: draft.applicationDeadline as Date | undefined,
  });

  const review = await prisma.reviewItem.create({
    data: {
      type: duplicates > 0 ? "POSSIBLE_DUPLICATE" : "NEW_OPPORTUNITY",
      status: "UNASSIGNED",
      title,
      opportunityId: opportunity.id,
      collectionItemId,
      extractedData: outcome as unknown as Prisma.InputJsonValue,
      fieldConfidence: confidenceMap(outcome) as Prisma.InputJsonValue,
      overallConfidence: averageConfidence(outcome),
      priority: duplicates > 0 ? 5 : 0,
    },
  });

  await audit({
    adminUserId: request.adminUserId ?? null,
    action: "ingestion.draft_created",
    entityType: "Opportunity",
    entityId: opportunity.id,
    summary: `Draft created from ${request.origin.replace(/_/g, " ").toLowerCase()}: "${title}"`,
    after: { provider: outcome.provider, classification },
  });

  return {
    collectionItemId,
    extractionRunId,
    opportunityId: opportunity.id,
    reviewItemId: review.id,
    classification,
    classificationConfidence: outcome.classification.confidence,
    outcome: "DRAFT_CREATED",
    duplicates,
    missingFields,
    message:
      duplicates > 0
        ? `Draft created, and it looks like ${duplicates} record${duplicates === 1 ? "" : "s"} already in the database. Review before publishing.`
        : "Draft created. Review it before publishing.",
  };
}

async function updateExisting(
  request: IngestRequest,
  collectionItemId: string,
  extractionRunId: string,
  outcome: ExtractionOutcome,
  draft: Record<string, unknown>,
  classification: CollectionClassification,
  missingFields: { field: string; label: string }[],
): Promise<IngestResult> {
  const current = await prisma.opportunity.findUnique({
    where: { id: request.existingOpportunityId! },
  });
  if (!current) {
    return createDraft(
      { ...request, existingOpportunityId: null },
      collectionItemId,
      extractionRunId,
      outcome,
      draft,
      classification,
      missingFields,
    );
  }

  const confidences = new Map(
    outcome.fields.map((f) => [
      f.name,
      { confidence: f.confidence, evidence: f.evidence || null },
    ]),
  );
  const changes = detectChanges(current, draft, confidences);

  await prisma.collectionItem.update({
    where: { id: collectionItemId },
    data: {
      status: "EXTRACTED",
      classification,
      classificationConfidence: outcome.classification.confidence,
      classificationReason: outcome.classification.reason,
      extractedData: outcome as unknown as Prisma.InputJsonValue,
      extractedAt: new Date(),
      opportunityId: current.id,
      lastCheckedAt: new Date(),
    },
  });

  await prisma.opportunity.update({
    where: { id: current.id },
    data: { lastCheckedAt: new Date() },
  });

  if (changes.length === 0) {
    return {
      collectionItemId,
      extractionRunId,
      opportunityId: current.id,
      reviewItemId: null,
      classification,
      classificationConfidence: outcome.classification.confidence,
      outcome: "UNCHANGED",
      duplicates: 0,
      missingFields,
      message: "Checked — nothing has changed.",
    };
  }

  // The public record keeps its approved values until an admin approves this.
  const review = await prisma.reviewItem.create({
    data: {
      type: "UPDATE",
      status: "UNASSIGNED",
      title: current.title,
      opportunityId: current.id,
      collectionItemId,
      proposedChanges: changes as unknown as Prisma.InputJsonValue,
      fieldConfidence: confidenceMap(outcome) as Prisma.InputJsonValue,
      overallConfidence: averageConfidence(outcome),
      priority: changes.some((c) => c.field === "applicationDeadline") ? 8 : 3,
    },
  });

  if (current.workflowStatus === "PUBLISHED") {
    await prisma.opportunity.update({
      where: { id: current.id },
      data: { workflowStatus: "UPDATE_PENDING_REVIEW" },
    });
  }

  await audit({
    adminUserId: request.adminUserId ?? null,
    action: "ingestion.update_detected",
    entityType: "Opportunity",
    entityId: current.id,
    summary: `${changes.length} change${changes.length === 1 ? "" : "s"} detected on "${current.title}"`,
    after: { fields: changes.map((c) => c.field) },
  });

  return {
    collectionItemId,
    extractionRunId,
    opportunityId: current.id,
    reviewItemId: review.id,
    classification,
    classificationConfidence: outcome.classification.confidence,
    outcome: "UPDATE_PROPOSED",
    duplicates: 0,
    missingFields,
    message: `${changes.length} change${changes.length === 1 ? "" : "s"} detected. The public page keeps its current information until you approve.`,
  };
}

export async function saveSuggestions(
  outcome: ExtractionOutcome,
  opportunityId: string | null,
  collectionItemId: string | null,
): Promise<void> {
  const slugs = outcome.categorySuggestions.map((s) => s.slug);
  const known = slugs.length
    ? await prisma.category.findMany({
        where: { slug: { in: slugs }, active: true },
        select: { id: true, slug: true },
      })
    : [];
  const bySlug = new Map(known.map((c) => [c.slug, c.id]));

  const rows: Prisma.CategorySuggestionCreateManyInput[] = [];

  for (const suggestion of outcome.categorySuggestions) {
    const categoryId = bySlug.get(suggestion.slug);
    if (!categoryId) continue;
    rows.push({
      opportunityId,
      collectionItemId,
      categoryId,
      confidence: suggestion.confidence,
      reason: suggestion.reason,
      status: "SUGGESTED",
    });
  }

  // A category that does not exist is proposed by name only. Taxonomy is never
  // created automatically — an admin decides.
  for (const suggestion of outcome.newCategorySuggestions) {
    rows.push({
      opportunityId,
      collectionItemId,
      suggestedName: suggestion.name.slice(0, 80),
      reason: suggestion.reason,
      status: "SUGGESTED",
    });
  }

  if (rows.length) {
    await prisma.categorySuggestion.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }
}

export async function recordDuplicates(
  opportunityId: string,
  candidate: {
    title: string;
    providerName?: string | null;
    applicationUrl?: string | null;
    officialSourceUrl?: string | null;
    applicationDeadline?: Date | null;
  },
): Promise<number> {
  const matches = await findDuplicates({ id: opportunityId, ...candidate });
  if (matches.length === 0) return 0;

  await prisma.duplicateCandidate.createMany({
    data: matches.map((match) => ({
      opportunityId,
      existingId: match.existing.id,
      score: match.score,
      signals: {
        signals: match.signals,
        looksLikeNewCohort: match.looksLikeNewCohort,
      } as unknown as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });

  return matches.length;
}

async function activeCategories() {
  const rows = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ categoryType: "asc" }, { displayOrder: "asc" }],
    select: {
      slug: true,
      name: true,
      categoryType: true,
      parent: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    type: row.categoryType,
    parent: row.parent?.name ?? null,
  }));
}

function averageConfidence(outcome: ExtractionOutcome): number {
  if (outcome.fields.length === 0) return 0;
  const total = outcome.fields.reduce((sum, f) => sum + f.confidence, 0);
  return Number((total / outcome.fields.length).toFixed(3));
}

function confidenceMap(outcome: ExtractionOutcome): Record<string, number> {
  return Object.fromEntries(outcome.fields.map((f) => [f.name, f.confidence]));
}

function missingImportantFields(
  outcome: ExtractionOutcome,
): { field: string; label: string }[] {
  const found = new Set(outcome.fields.map((f) => f.name));
  return IMPORTANT_FIELDS.filter((field) => !found.has(field)).map((field) => ({
    field,
    label: FIELD_LABEL[field as ExtractionField],
  }));
}

function hostOf(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function parkedResult(
  item: { id: string },
  outcome: IngestResult["outcome"],
  message: string,
): IngestResult {
  return {
    collectionItemId: item.id,
    extractionRunId: "",
    opportunityId: null,
    reviewItemId: null,
    classification: "UNKNOWN",
    classificationConfidence: 0,
    outcome,
    duplicates: 0,
    missingFields: [],
    message,
  };
}

export { findDuplicates, fingerprint } from "./duplicates";
export { detectChanges } from "./changes";
