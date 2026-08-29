"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CATALOG_TAG } from "@/lib/cache-tags";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { uniqueSlug } from "@/lib/utils";
import {
  OpportunityInput,
  readOpportunityForm,
  type OpportunityInputType,
} from "@/lib/validation/opportunity";
import { blockingFailures, publishRequirements } from "@/lib/publishing";
import { TO_REVIEW_STATUSES } from "@/lib/admin/status-view";
import { diffFields, recordVersion, snapshotOf } from "@/lib/versioning";

export type OpportunityFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function revalidateOpportunityViews(slug?: string) {
  revalidateTag(PUBLIC_CATALOG_TAG);
  revalidatePath("/admin/opportunities");
  revalidatePath("/");
  revalidatePath("/opportunities");
  if (slug) revalidatePath(`/opportunities/${slug}`);
}

function collectFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    fieldErrors[String(issue.path[0])] ??= issue.message;
  }
  return fieldErrors;
}

/** Maps validated input onto the Prisma columns, minus slug and categories. */
function toColumns(input: OpportunityInputType) {
  const rest = { ...input } as Partial<OpportunityInputType>;
  delete rest.slug;
  delete rest.categoryIds;
  delete rest.primaryCategoryId;
  delete rest.fundingMin;
  delete rest.fundingMax;

  return {
    ...(rest as Omit<
      OpportunityInputType,
      "slug" | "categoryIds" | "primaryCategoryId" | "fundingMin" | "fundingMax"
    >),
    fundingMin:
      input.fundingMin === null ? null : new Prisma.Decimal(input.fundingMin),
    fundingMax:
      input.fundingMax === null ? null : new Prisma.Decimal(input.fundingMax),
  };
}

async function syncCategories(
  opportunityId: string,
  categoryIds: string[],
  primaryCategoryId: string | null,
) {
  const valid = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, categoryType: true, displayOrder: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      })
    : [];
  const validIds = new Set(valid.map((c) => c.id));

  // Fall back to the first opportunity-type category so a record always has a
  // primary to file it under, rather than silently having none.
  const primary =
    primaryCategoryId && validIds.has(primaryCategoryId)
      ? primaryCategoryId
      : (valid.find((c) => c.categoryType === "OPPORTUNITY_TYPE")?.id ?? null);

  await prisma.$transaction([
    prisma.opportunityCategory.deleteMany({
      where: { opportunityId, categoryId: { notIn: [...validIds] } },
    }),
    ...[...validIds].map((categoryId) =>
      prisma.opportunityCategory.upsert({
        where: { opportunityId_categoryId: { opportunityId, categoryId } },
        create: { opportunityId, categoryId, isPrimary: categoryId === primary },
        update: { isPrimary: categoryId === primary },
      }),
    ),
  ]);
}

async function categoryTypesFor(opportunityId: string): Promise<string[]> {
  const rows = await prisma.opportunityCategory.findMany({
    where: { opportunityId },
    select: { category: { select: { categoryType: true } } },
  });
  return rows.map((r) => r.category.categoryType);
}

export async function saveOpportunityAction(
  _prev: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "draft");

  const parsed = OpportunityInput.safeParse(readOpportunityForm(formData));
  if (!parsed.success) {
    return {
      error: "Some fields need attention before this can be saved.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const input = parsed.data;
  const columns = toColumns(input);
  const now = new Date();

  const existing = id
    ? await prisma.opportunity.findUnique({ where: { id } })
    : null;
  if (id && !existing) return { error: "That opportunity no longer exists." };

  const slug = existing
    ? input.slug || existing.slug
    : await uniqueSlug(input.slug || input.title, async (s) =>
        Boolean(
          await prisma.opportunity.findUnique({
            where: { slug: s },
            select: { id: true },
          }),
        ),
      );

  if (existing && slug !== existing.slug) {
    const clash = await prisma.opportunity.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (clash && clash.id !== existing.id) {
      return {
        error: "That URL slug is already used by another opportunity.",
        fieldErrors: { slug: "Already in use" },
      };
    }
  }

  const saved = existing
    ? await prisma.opportunity.update({
        where: { id: existing.id },
        data: { ...columns, slug, lastCheckedAt: now, contentLastUpdatedAt: now },
      })
    : await prisma.opportunity.create({
        data: {
          ...columns,
          slug,
          workflowStatus: "DRAFT",
          verificationStatus: "ADMIN_REVIEWED",
          createdById: admin.id,
          extractionDate: now,
          lastCheckedAt: now,
          lastVerifiedAt: now,
          sourceWebsite: safeHost(input.officialSourceUrl),
          originalSourceUrl: input.officialSourceUrl,
        },
      });

  await syncCategories(saved.id, input.categoryIds, input.primaryCategoryId);

  if (intent === "publish") {
    // Review accepts or rejects; it never publishes. The review screen hides
    // the control, and this refuses the request even if one is crafted by
    // hand, so a record cannot skip the draft step.
    if (existing && TO_REVIEW_STATUSES.includes(existing.workflowStatus)) {
      revalidateOpportunityViews(saved.slug);
      return {
        error:
          "This record is still in review. Save it as a draft first, then publish it from the draft page.",
      };
    }

    const result = await publishOpportunity(saved.id, admin.id);
    if (!result.ok) {
      revalidateOpportunityViews(saved.slug);
      return {
        error: `Cannot publish yet — ${result.missing.join("; ")}. Your changes are saved as a draft.`,
      };
    }
  } else if (existing) {
    const before = snapshotOf(existing as unknown as Record<string, unknown>);
    const after = snapshotOf(saved as unknown as Record<string, unknown>);
    const changed = diffFields(before, after);
    if (changed.length) {
      const versionNumber = await recordVersion({
        opportunityId: saved.id,
        snapshot: after,
        changedFields: changed,
        changeSummary: `Edited by ${admin.name}`,
        sourceUrl: saved.officialSourceUrl,
        createdById: admin.id,
      });
      await prisma.opportunity.update({
        where: { id: saved.id },
        data: { currentVersion: versionNumber },
      });
    }
  }

  await audit({
    adminUserId: admin.id,
    action: existing ? "opportunity.update" : "opportunity.create",
    entityType: "Opportunity",
    entityId: saved.id,
    summary: `${existing ? "Updated" : "Created"} "${saved.title}"`,
  });

  revalidateOpportunityViews(saved.slug);
  redirect(`/admin/opportunities/${saved.id}?saved=1`);
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * The single publish path. Everything — manual entry and the review queue —
 * goes through here so the required-field contract can never be sidestepped.
 */
export async function publishOpportunity(
  opportunityId: string,
  adminUserId: string,
): Promise<{ ok: true } | { ok: false; missing: string[] }> {
  const row = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!row) return { ok: false, missing: ["the record no longer exists"] };

  const categoryTypes = await categoryTypesFor(opportunityId);
  const failures = blockingFailures(
    publishRequirements({ ...row, categoryTypes }),
  );
  if (failures.length) {
    return { ok: false, missing: failures.map((f) => f.label.toLowerCase()) };
  }

  const now = new Date();
  const published = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      workflowStatus: "PUBLISHED",
      verificationStatus: "ADMIN_VERIFIED",
      isActive: true,
      approvedById: adminUserId,
      approvedAt: row.approvedAt ?? now,
      publishedById: adminUserId,
      publishedAt: row.publishedAt ?? now,
      lastVerifiedAt: now,
    },
  });

  const versionNumber = await recordVersion({
    opportunityId,
    snapshot: snapshotOf(published as unknown as Record<string, unknown>),
    changedFields: ["workflowStatus"],
    changeSummary: row.publishedAt ? "Republished" : "Published",
    sourceUrl: published.officialSourceUrl,
    createdById: adminUserId,
    approvedById: adminUserId,
  });

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { currentVersion: versionNumber },
  });

  await audit({
    adminUserId,
    action: "opportunity.publish",
    entityType: "Opportunity",
    entityId: opportunityId,
    summary: `Published "${published.title}"`,
  });

  revalidateOpportunityViews(published.slug);
  return { ok: true };
}

export async function setOpportunityStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed = ["DRAFT", "ARCHIVED", "PUBLISHED"];
  if (!allowed.includes(status)) return;

  const row = await prisma.opportunity.findUnique({ where: { id } });
  if (!row) return;

  if (status === "PUBLISHED") {
    const result = await publishOpportunity(id, admin.id);
    if (!result.ok) {
      redirect(
        `/admin/opportunities/${id}?error=${encodeURIComponent(
          `Cannot publish yet — ${result.missing.join("; ")}.`,
        )}`,
      );
    }
    redirect(`/admin/opportunities/${id}?published=1`);
  }

  const updated = await prisma.opportunity.update({
    where: { id },
    data: {
      workflowStatus: status as "DRAFT" | "ARCHIVED",
      isActive: status !== "ARCHIVED",
    },
  });

  const versionNumber = await recordVersion({
    opportunityId: id,
    snapshot: snapshotOf(updated as unknown as Record<string, unknown>),
    changedFields: ["workflowStatus"],
    changeSummary: status === "ARCHIVED" ? "Archived" : "Withdrawn to draft",
    createdById: admin.id,
  });

  await prisma.opportunity.update({
    where: { id },
    data: { currentVersion: versionNumber },
  });

  await audit({
    adminUserId: admin.id,
    action: `opportunity.${status.toLowerCase()}`,
    entityType: "Opportunity",
    entityId: id,
    summary: `${status === "ARCHIVED" ? "Archived" : "Unpublished"} "${row.title}"`,
  });

  revalidateOpportunityViews(row.slug);
  redirect(`/admin/opportunities/${id}?statusChanged=1`);
}
