"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { DuplicateStatus, Prisma, RejectionReason } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CATALOG_TAG } from "@/lib/cache-tags";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { fingerprint } from "@/lib/ingestion";
import { hashContent } from "@/lib/ingestion";
import { recordVersion, snapshotOf } from "@/lib/versioning";
import type { DetectedChange } from "@/lib/ingestion/changes";

/** Review items still waiting on a person. Mirrors the review queue. */
const OPEN_REVIEW_STATUSES = [
  "UNASSIGNED",
  "ASSIGNED",
  "UNDER_REVIEW",
  "READY_FOR_APPROVAL",
] as const;

function revalidateReview(opportunityId?: string) {
  revalidateTag(PUBLIC_CATALOG_TAG);
  revalidatePath("/admin/review");
  revalidatePath("/admin/inbox");
  revalidatePath("/admin");
  if (opportunityId) revalidatePath(`/admin/review/${opportunityId}`);
}

/** Accepts or rejects one AI category suggestion. */
export async function resolveSuggestionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("suggestionId") ?? "");
  const accept = formData.get("accept") === "1";

  const suggestion = await prisma.categorySuggestion.findUnique({ where: { id } });
  if (!suggestion?.opportunityId) return;

  if (accept && suggestion.categoryId) {
    await prisma.opportunityCategory.upsert({
      where: {
        opportunityId_categoryId: {
          opportunityId: suggestion.opportunityId,
          categoryId: suggestion.categoryId,
        },
      },
      create: {
        opportunityId: suggestion.opportunityId,
        categoryId: suggestion.categoryId,
      },
      update: {},
    });
  }

  await prisma.categorySuggestion.update({
    where: { id },
    data: { status: accept ? "ACCEPTED" : "REJECTED" },
  });

  await audit({
    adminUserId: admin.id,
    action: accept ? "review.suggestion_accepted" : "review.suggestion_rejected",
    entityType: "Opportunity",
    entityId: suggestion.opportunityId,
    summary: `${accept ? "Accepted" : "Dismissed"} a suggested category`,
  });

  revalidateReview(suggestion.opportunityId);
}

const REJECTION_REASONS: RejectionReason[] = [
  "NOT_A_STARTUP_FUNDING_OPPORTUNITY",
  "DUPLICATE",
  "EXPIRED",
  "INCORRECT_INFORMATION",
  "UNRELIABLE_SOURCE",
  "NOT_RELEVANT_TO_USERS",
  "UNABLE_TO_VERIFY",
  "SPAM",
  "OTHER",
];

/**
 * Rejecting remembers the URL and a fingerprint of the content, so the crawler
 * does not keep producing the same review item.
 */
export async function rejectAction(formData: FormData) {
  const admin = await requireAdmin();
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const reason = String(formData.get("reason") ?? "OTHER") as RejectionReason;
  const note = String(formData.get("note") ?? "").trim();

  if (!REJECTION_REASONS.includes(reason)) return;

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { collectionItems: { orderBy: { discoveredAt: "desc" }, take: 1 } },
  });
  if (!opportunity) return;

  const item = opportunity.collectionItems[0];

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { workflowStatus: "REJECTED", isActive: false },
  });

  await prisma.reviewItem.updateMany({
    where: { opportunityId, status: { not: "REJECTED" } },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
      rejectionNote: note || null,
      resolvedById: admin.id,
      resolvedAt: new Date(),
    },
  });

  const url = item?.canonicalUrl ?? item?.url ?? null;
  const contentPrint = item?.rawText ? hashContent(item.rawText) : null;

  for (const [field, value] of [
    ["url", url],
    ["fingerprint", contentPrint],
  ] as const) {
    if (!value) continue;
    await prisma.rejectedItem
      .upsert({
        where: field === "url" ? { url: value } : { fingerprint: value },
        create: {
          [field]: value,
          title: opportunity.title,
          reason,
          note: note || null,
        } as Prisma.RejectedItemCreateInput,
        update: { reason, note: note || null },
      })
      .catch(() => undefined);
  }

  // Also remember the title-and-provider shape, which catches the same
  // announcement arriving from a different address.
  await prisma.rejectedItem
    .upsert({
      where: { fingerprint: fingerprint(opportunity.title, opportunity.providerName) },
      create: {
        fingerprint: fingerprint(opportunity.title, opportunity.providerName),
        title: opportunity.title,
        reason,
        note: note || null,
      },
      update: { reason },
    })
    .catch(() => undefined);

  await audit({
    adminUserId: admin.id,
    action: "review.rejected",
    entityType: "Opportunity",
    entityId: opportunityId,
    summary: `Rejected "${opportunity.title}" — ${reason.replace(/_/g, " ").toLowerCase()}`,
    after: { reason, note },
  });

  revalidateReview(opportunityId);
  redirect("/admin/review?rejected=1");
}

/**
 * Accepts an incoming record into the drafts an admin owns.
 *
 * Review is for deciding whether the material is worth keeping, not for
 * publishing: the record moves to the existing DRAFT status and leaves the
 * queue. Publication happens later, from the draft page, behind the
 * required-field gate. No new status is introduced, and nothing here can put a
 * record on the public site.
 */
export async function saveAsDraftAction(formData: FormData) {
  const admin = await requireAdmin();
  const opportunityId = String(formData.get("opportunityId") ?? "");

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    select: { id: true, title: true, workflowStatus: true },
  });
  if (!opportunity) return;

  // A record that is already published stays published — a detected update
  // must never silently unpublish the live page.
  if (opportunity.workflowStatus !== "PUBLISHED") {
    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { workflowStatus: "DRAFT", isActive: false },
    });
  }

  await prisma.reviewItem.updateMany({
    where: { opportunityId, status: { in: [...OPEN_REVIEW_STATUSES] } },
    data: { status: "APPROVED", resolvedById: admin.id, resolvedAt: new Date() },
  });

  await audit({
    adminUserId: admin.id,
    action: "review.saved_as_draft",
    entityType: "Opportunity",
    entityId: opportunityId,
    summary: `Accepted "${opportunity.title}" into drafts`,
  });

  revalidateReview(opportunityId);
  revalidatePath("/admin/opportunities");
  redirect(`/admin/opportunities/${opportunityId}?drafted=1`);
}

/** Applies a detected update to the public record, with a version recorded. */
export async function approveUpdateAction(formData: FormData) {
  const admin = await requireAdmin();
  const reviewItemId = String(formData.get("reviewItemId") ?? "");
  const accepted = formData.getAll("fields").map(String);

  const review = await prisma.reviewItem.findUnique({
    where: { id: reviewItemId },
    include: { opportunity: true },
  });
  if (!review?.opportunity || review.type !== "UPDATE") return;

  const changes = (review.proposedChanges ?? []) as unknown as DetectedChange[];
  const applying = changes.filter((c) => accepted.includes(c.field));

  if (applying.length === 0) {
    redirect(`/admin/review/updates/${reviewItemId}?error=Pick+at+least+one+change`);
  }

  const data: Record<string, unknown> = {};
  for (const change of applying) {
    data[change.field] = coerce(change.field, change.detected);
  }

  const updated = await prisma.opportunity.update({
    where: { id: review.opportunityId! },
    data: {
      ...data,
      workflowStatus: "PUBLISHED",
      lastVerifiedAt: new Date(),
      contentLastUpdatedAt: new Date(),
    },
  });

  const versionNumber = await recordVersion({
    opportunityId: updated.id,
    snapshot: snapshotOf(updated as unknown as Record<string, unknown>),
    changedFields: applying.map((c) => c.field),
    changeSummary: applying
      .map((c) => `${c.label}: ${c.current ?? "not set"} → ${c.detected}`)
      .join("; "),
    sourceUrl: updated.officialSourceUrl,
    createdById: admin.id,
    approvedById: admin.id,
  });

  await prisma.opportunity.update({
    where: { id: updated.id },
    data: { currentVersion: versionNumber },
  });

  await prisma.reviewItem.update({
    where: { id: reviewItemId },
    data: { status: "APPROVED", resolvedById: admin.id, resolvedAt: new Date() },
  });

  await audit({
    adminUserId: admin.id,
    action: "review.update_approved",
    entityType: "Opportunity",
    entityId: updated.id,
    summary: `Approved ${applying.length} change${applying.length === 1 ? "" : "s"} on "${updated.title}"`,
    after: { fields: applying.map((c) => c.field) },
  });

  revalidatePath(`/opportunities/${updated.slug}`);
  revalidateReview(updated.id);
  redirect("/admin/review?updated=1");
}

export async function rejectUpdateAction(formData: FormData) {
  const admin = await requireAdmin();
  const reviewItemId = String(formData.get("reviewItemId") ?? "");

  const review = await prisma.reviewItem.findUnique({
    where: { id: reviewItemId },
    include: { opportunity: { select: { id: true, title: true, publishedAt: true } } },
  });
  if (!review?.opportunity) return;

  await prisma.reviewItem.update({
    where: { id: reviewItemId },
    data: {
      status: "REJECTED",
      rejectionReason: "INCORRECT_INFORMATION",
      resolvedById: admin.id,
      resolvedAt: new Date(),
    },
  });

  // The record goes back to being simply published — the approved values were
  // never touched.
  await prisma.opportunity.update({
    where: { id: review.opportunity.id },
    data: {
      workflowStatus: review.opportunity.publishedAt ? "PUBLISHED" : "DRAFT",
      lastCheckedAt: new Date(),
    },
  });

  await audit({
    adminUserId: admin.id,
    action: "review.update_rejected",
    entityType: "Opportunity",
    entityId: review.opportunity.id,
    summary: `Rejected the detected changes on "${review.opportunity.title}"`,
  });

  revalidateReview(review.opportunity.id);
  redirect("/admin/review?updateRejected=1");
}

/** Resolves a duplicate pair the way the admin decides. */
export async function resolveDuplicateAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("duplicateId") ?? "");
  const resolution = String(formData.get("resolution") ?? "") as DuplicateStatus;

  const allowed: DuplicateStatus[] = [
    "KEPT_EXISTING",
    "UPDATED_EXISTING",
    "MERGED",
    "NEW_COHORT",
    "KEPT_BOTH",
    "REJECTED",
  ];
  if (!allowed.includes(resolution)) return;

  const candidate = await prisma.duplicateCandidate.findUnique({
    where: { id },
    include: {
      opportunity: { select: { id: true, title: true } },
      existing: { select: { id: true, title: true } },
    },
  });
  if (!candidate) return;

  await prisma.duplicateCandidate.update({
    where: { id },
    data: { status: resolution, resolvedById: admin.id, resolvedAt: new Date() },
  });

  // "Keep the existing one" and "reject" both retire the new draft. A merge
  // moves the draft's categories onto the record that is already live.
  if (resolution === "KEPT_EXISTING" || resolution === "REJECTED") {
    await prisma.opportunity.update({
      where: { id: candidate.opportunityId },
      data: { workflowStatus: "REJECTED", isActive: false },
    });
    await prisma.reviewItem.updateMany({
      where: { opportunityId: candidate.opportunityId },
      data: {
        status: "REJECTED",
        rejectionReason: "DUPLICATE",
        resolvedById: admin.id,
        resolvedAt: new Date(),
      },
    });
  }

  if (resolution === "MERGED") {
    const links = await prisma.opportunityCategory.findMany({
      where: { opportunityId: candidate.opportunityId },
      select: { categoryId: true },
    });
    for (const link of links) {
      await prisma.opportunityCategory
        .upsert({
          where: {
            opportunityId_categoryId: {
              opportunityId: candidate.existingId,
              categoryId: link.categoryId,
            },
          },
          create: { opportunityId: candidate.existingId, categoryId: link.categoryId },
          update: {},
        })
        .catch(() => undefined);
    }
    await prisma.opportunity.update({
      where: { id: candidate.opportunityId },
      data: { workflowStatus: "ARCHIVED", isActive: false },
    });
  }

  if (resolution === "NEW_COHORT" || resolution === "KEPT_BOTH") {
    // Both stay. The draft continues through normal review.
    await prisma.reviewItem.updateMany({
      where: { opportunityId: candidate.opportunityId, type: "POSSIBLE_DUPLICATE" },
      data: { type: "NEW_OPPORTUNITY", status: "UNASSIGNED", priority: 0 },
    });
  }

  await audit({
    adminUserId: admin.id,
    action: "review.duplicate_resolved",
    entityType: "Opportunity",
    entityId: candidate.opportunityId,
    summary: `"${candidate.opportunity.title}" vs "${candidate.existing.title}" — ${resolution.replace(/_/g, " ").toLowerCase()}`,
  });

  revalidateReview(candidate.opportunityId);
  redirect("/admin/review?duplicateResolved=1");
}

/** Assigns a review item to an admin, or takes it. */
export async function assignReviewAction(formData: FormData) {
  const admin = await requireAdmin();
  const reviewItemId = String(formData.get("reviewItemId") ?? "");
  const assigneeId = String(formData.get("assigneeId") ?? admin.id);

  await prisma.reviewItem.update({
    where: { id: reviewItemId },
    data: {
      assignedReviewerId: assigneeId || null,
      status: assigneeId ? "ASSIGNED" : "UNASSIGNED",
    },
  });

  revalidateReview();
}

export async function saveReviewNotesAction(formData: FormData) {
  await requireAdmin();
  const reviewItemId = String(formData.get("reviewItemId") ?? "");
  const notes = String(formData.get("reviewNotes") ?? "").slice(0, 4000);

  await prisma.reviewItem.update({
    where: { id: reviewItemId },
    data: { reviewNotes: notes || null },
  });

  revalidateReview();
}

/** Promotes an inbox item that was parked into a draft an admin can edit. */
export async function ignoreCollectionItemAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("collectionItemId") ?? "");

  await prisma.collectionItem.update({ where: { id }, data: { status: "IGNORED" } });
  await audit({
    adminUserId: admin.id,
    action: "inbox.ignored",
    entityType: "CollectionItem",
    entityId: id,
    summary: "Ignored an inbox item",
  });

  revalidateReview();
}

function coerce(field: string, value: string): unknown {
  if (/Date|Deadline/.test(field)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (/^is|^requires|^offers/.test(field)) return value === "true";
  if (/^funding(Min|Max)$/.test(field)) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : null;
  }
  return value;
}
