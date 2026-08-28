"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireAdmin, requireRole } from "@/lib/auth/admin";
import { slugify, uniqueSlug } from "@/lib/utils";
import { CategoryInput, readCategoryForm } from "@/lib/validation/category";

export type CategoryFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function revalidateCategoryViews(slug?: string) {
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/categories");
  if (slug) revalidatePath(`/categories/${slug}`);
}

async function slugTaken(slug: string, exceptId?: string) {
  const row = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  return Boolean(row && row.id !== exceptId);
}

function collectFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0]);
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

/** Walks up from `nodeId` to see whether `ancestorId` sits above it. */
async function isDescendant(nodeId: string, ancestorId: string): Promise<boolean> {
  let cursor: string | null = nodeId;
  for (let hops = 0; cursor && hops < 25; hops += 1) {
    if (cursor === ancestorId) return true;
    const row: { parentId: string | null } | null =
      await prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
    cursor = row?.parentId ?? null;
  }
  return false;
}

export async function createCategoryAction(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const admin = await requireAdmin();
  const parsed = CategoryInput.safeParse(readCategoryForm(formData));

  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const data = parsed.data;
  const requested = data.slug || slugify(data.name);
  const slug = data.slug
    ? requested
    : await uniqueSlug(requested, (s) => slugTaken(s));

  if (data.slug && (await slugTaken(slug))) {
    return {
      error: "That slug is already used by another category.",
      fieldErrors: { slug: "Already in use" },
    };
  }

  if (data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: data.parentId },
      select: { categoryType: true },
    });
    if (!parent) return { error: "The selected parent category no longer exists." };
    if (parent.categoryType !== data.categoryType) {
      return {
        error: "A category must sit under a parent of the same category type.",
        fieldErrors: { parentId: "Parent has a different type" },
      };
    }
  }

  const created = await prisma.category.create({ data: { ...data, slug } });

  await audit({
    adminUserId: admin.id,
    action: "category.create",
    entityType: "Category",
    entityId: created.id,
    summary: `Created category "${created.name}"`,
    after: { name: created.name, slug: created.slug, type: created.categoryType },
  });

  revalidateCategoryViews(created.slug);
  redirect(`/admin/categories?type=${created.categoryType}&created=${created.id}`);
}

export async function updateCategoryAction(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing category id." };

  const before = await prisma.category.findUnique({ where: { id } });
  if (!before) return { error: "That category no longer exists." };

  const parsed = CategoryInput.safeParse(readCategoryForm(formData));
  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }

  const data = parsed.data;
  const slug = data.slug || before.slug;

  if (await slugTaken(slug, id)) {
    return {
      error: "That slug is already used by another category.",
      fieldErrors: { slug: "Already in use" },
    };
  }

  if (data.parentId === id) return { error: "A category cannot be its own parent." };

  if (data.parentId && (await isDescendant(data.parentId, id))) {
    return {
      error: "That parent sits underneath this category — it would create a loop.",
      fieldErrors: { parentId: "Would create a loop" },
    };
  }

  const updated = await prisma.category.update({
    where: { id },
    data: { ...data, slug },
  });

  await audit({
    adminUserId: admin.id,
    action: "category.update",
    entityType: "Category",
    entityId: id,
    summary: `Updated category "${updated.name}"`,
    before: { name: before.name, slug: before.slug, active: before.active },
    after: { name: updated.name, slug: updated.slug, active: updated.active },
  });

  revalidateCategoryViews(updated.slug);
  if (before.slug !== updated.slug) revalidatePath(`/categories/${before.slug}`);

  redirect(`/admin/categories?type=${updated.categoryType}&updated=${id}`);
}

export async function toggleCategoryActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return;

  const updated = await prisma.category.update({
    where: { id },
    data: { active: !category.active },
  });

  await audit({
    adminUserId: admin.id,
    action: updated.active ? "category.activate" : "category.deactivate",
    entityType: "Category",
    entityId: id,
    summary: `${updated.active ? "Activated" : "Deactivated"} "${updated.name}"`,
  });

  revalidateCategoryViews(updated.slug);
}

export async function toggleCategoryFlagAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const flag = String(formData.get("flag") ?? "");
  if (flag !== "featured" && flag !== "showOnHomepage") return;

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return;

  const updated = await prisma.category.update({
    where: { id },
    data: { [flag]: !category[flag] },
  });

  await audit({
    adminUserId: admin.id,
    action: "category.flag",
    entityType: "Category",
    entityId: id,
    summary: `${flag} turned ${updated[flag] ? "on" : "off"} for "${updated.name}"`,
  });

  revalidateCategoryViews(updated.slug);
}

export async function reorderCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) return;

  const neighbour = await prisma.category.findFirst({
    where: {
      categoryType: current.categoryType,
      parentId: current.parentId,
      displayOrder:
        direction === "up"
          ? { lte: current.displayOrder }
          : { gte: current.displayOrder },
      NOT: { id },
    },
    orderBy: [
      { displayOrder: direction === "up" ? "desc" : "asc" },
      { name: direction === "up" ? "desc" : "asc" },
    ],
  });

  if (!neighbour) return;

  // Equal orders are possible, so swap onto distinct values rather than
  // exchanging two identical numbers and appearing to do nothing.
  const [lowId, highId] =
    direction === "up" ? [current.id, neighbour.id] : [neighbour.id, current.id];
  const low = Math.min(current.displayOrder, neighbour.displayOrder);
  const high = Math.max(current.displayOrder, neighbour.displayOrder);
  const span = low === high ? [low, low + 1] : [low, high];

  await prisma.$transaction([
    prisma.category.update({ where: { id: lowId }, data: { displayOrder: span[0] } }),
    prisma.category.update({ where: { id: highId }, data: { displayOrder: span[1] } }),
  ]);

  revalidateCategoryViews();
}

export async function deleteCategoryAction(formData: FormData) {
  const admin = await requireRole("SUPER_ADMIN");
  const id = String(formData.get("id") ?? "");

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { children: true, opportunities: true } } },
  });
  if (!category) return;

  if (category._count.children > 0) {
    redirect(
      `/admin/categories?error=${encodeURIComponent(
        `"${category.name}" still has subcategories. Move or delete those first.`,
      )}`,
    );
  }

  await prisma.category.delete({ where: { id } });

  await audit({
    adminUserId: admin.id,
    action: "category.delete",
    entityType: "Category",
    entityId: id,
    summary: `Deleted "${category.name}" (was assigned to ${category._count.opportunities} opportunities)`,
    before: { name: category.name, slug: category.slug },
  });

  revalidateCategoryViews(category.slug);
  redirect(`/admin/categories?type=${category.categoryType}&deleted=1`);
}
