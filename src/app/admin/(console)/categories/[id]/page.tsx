import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "../category-form";
import { updateCategoryAction } from "../actions";

export const metadata = { title: "Edit category" };
export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [category, parents] = await Promise.all([
    prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { opportunities: true, children: true } } },
    }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ categoryType: "asc" }, { displayOrder: "asc" }],
      select: { id: true, name: true, categoryType: true },
    }),
  ]);

  if (!category) notFound();

  return (
    <>
      <PageHeader
        title={category.name}
        breadcrumbs={[
          { label: "Categories", href: "/admin/categories" },
          { label: category.name },
        ]}
        description={`${category._count.opportunities} opportunities · ${category._count.children} subcategories`}
        actions={
          <Link
            href={`/categories/${category.slug}`}
            className="btn btn-secondary btn-sm"
            target="_blank"
          >
            View public page
          </Link>
        }
      />
      <PageBody>
        <CategoryForm
          action={updateCategoryAction}
          category={category}
          parents={parents}
        />
      </PageBody>
    </>
  );
}
