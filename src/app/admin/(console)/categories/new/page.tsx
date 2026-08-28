import type { CategoryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { CATEGORY_TYPES } from "@/lib/validation/category";
import { CategoryForm } from "../category-form";
import { createCategoryAction } from "../actions";

export const metadata = { title: "New category" };
export const dynamic = "force-dynamic";

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireAdmin();
  const { type } = await searchParams;
  const defaultType = CATEGORY_TYPES.includes(type as CategoryType)
    ? (type as CategoryType)
    : undefined;

  const parents = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ categoryType: "asc" }, { displayOrder: "asc" }],
    select: { id: true, name: true, categoryType: true },
  });

  return (
    <>
      <PageHeader
        title="Add category"
        breadcrumbs={[
          { label: "Categories", href: "/admin/categories" },
          { label: "Add" },
        ]}
        description="Categories are data, not code. This one is usable the moment you save it."
      />
      <PageBody>
        <CategoryForm
          action={createCategoryAction}
          parents={parents}
          defaultType={defaultType}
        />
      </PageBody>
    </>
  );
}
