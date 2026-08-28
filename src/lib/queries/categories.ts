import "server-only";
import { prisma } from "@/lib/prisma";
import type { PickerCategory } from "@/components/admin/category-picker";

/** Flat list with parent names resolved, for the admin multi-select. */
export async function pickerCategories(): Promise<PickerCategory[]> {
  const rows = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ categoryType: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      categoryType: true,
      parentId: true,
      parent: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    categoryType: row.categoryType,
    parentId: row.parentId,
    parentName: row.parent?.name ?? null,
  }));
}
