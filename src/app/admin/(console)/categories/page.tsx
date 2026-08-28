import Link from "next/link";
import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import type { CategoryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { Icon } from "@/components/admin/icon";
import { FormError, FormNotice } from "@/components/ui/form";
import {
  CATEGORY_TYPES,
  CATEGORY_TYPE_HINT,
  CATEGORY_TYPE_LABEL,
} from "@/lib/validation/category";
import { cn } from "@/lib/utils";
import {
  deleteCategoryAction,
  reorderCategoryAction,
  toggleCategoryActiveAction,
  toggleCategoryFlagAction,
} from "./actions";

export const metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

type Search = {
  type?: string;
  created?: string;
  updated?: string;
  deleted?: string;
  error?: string;
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const activeType: CategoryType = CATEGORY_TYPES.includes(
    params.type as CategoryType,
  )
    ? (params.type as CategoryType)
    : "OPPORTUNITY_TYPE";

  const [rows, counts] = await Promise.all([
    prisma.category.findMany({
      where: { categoryType: activeType },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { opportunities: true, children: true } },
      },
    }),
    prisma.category.groupBy({ by: ["categoryType"], _count: { _all: true } }),
  ]);

  const countByType = new Map(
    counts.map((c) => [c.categoryType, c._count._all]),
  );

  const topLevel = rows.filter((r) => !r.parentId);
  const childrenOf = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const list = childrenOf.get(row.parentId) ?? [];
    list.push(row);
    childrenOf.set(row.parentId, list);
  }
  const orphans = rows.filter(
    (r) => r.parentId && !rows.some((c) => c.id === r.parentId),
  );
  const ordered = [
    ...topLevel.flatMap((parent) => [
      { row: parent, depth: 0 },
      ...(childrenOf.get(parent.id) ?? []).map((child) => ({
        row: child,
        depth: 1,
      })),
    ]),
    ...orphans.map((row) => ({ row, depth: 0 })),
  ];

  return (
    <>
      <PageHeader
        title="Categories"
        description="Every classification on the platform lives here. Nothing is hard-coded in the frontend — what you change is what visitors see."
        actions={
          <Link
            href={`/admin/categories/new?type=${activeType}`}
            className="btn btn-primary btn-sm"
          >
            Add category
          </Link>
        }
      />

      <PageBody>
        {params.error ? (
          <div className="mb-5">
            <FormError message={params.error} />
          </div>
        ) : null}
        {params.created || params.updated || params.deleted ? (
          <div className="mb-5">
            <FormNotice
              message={
                params.deleted
                  ? "Category deleted."
                  : params.created
                    ? "Category created. It is live on the public site straight away."
                    : "Category updated. The public category page now reflects your changes."
              }
            />
          </div>
        ) : null}

        <nav className="mb-1 flex flex-wrap gap-1.5" aria-label="Category dimension">
          {CATEGORY_TYPES.map((type) => {
            const isActive = type === activeType;
            return (
              <Link
                key={type}
                href={`/admin/categories?type=${type}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[7px] border px-3 py-1.5 text-[13px] transition-colors duration-200",
                  isActive
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {CATEGORY_TYPE_LABEL[type]}
                <span
                  className={cn(
                    "text-[11.5px] tabular-nums",
                    isActive ? "text-accent" : "text-faint",
                  )}
                >
                  {countByType.get(type) ?? 0}
                </span>
              </Link>
            );
          })}
        </nav>
        <p className="hint mb-5">{CATEGORY_TYPE_HINT[activeType]}</p>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-subtle">
                  <Th className="w-[34%]">Category</Th>
                  <Th>Slug</Th>
                  <Th className="text-right">Opportunities</Th>
                  <Th className="text-center">Active</Th>
                  <Th className="text-center">Featured</Th>
                  <Th className="text-center">Homepage</Th>
                  <Th className="text-right">Order</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ordered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[13.5px] text-muted">
                      No categories of this type yet.
                    </td>
                  </tr>
                ) : (
                  ordered.map(({ row, depth }) => (
                    <tr key={row.id} className="align-middle hover:bg-subtle/60">
                      <Td>
                        <div
                          className="flex items-center gap-2.5"
                          style={{ paddingLeft: depth * 22 }}
                        >
                          {depth > 0 ? (
                            <span className="text-faint" aria-hidden="true">
                              └
                            </span>
                          ) : null}
                          <span className="grid size-7 shrink-0 place-items-center rounded-[6px] border border-line bg-canvas">
                            <Icon name={row.icon} className="size-3.5" />
                          </span>
                          <span className="min-w-0">
                            <Link
                              href={`/admin/categories/${row.id}`}
                              className="block truncate text-[13.5px] font-medium underline-offset-2 hover:underline"
                            >
                              {row.name}
                            </Link>
                            {row.parent ? (
                              <span className="block text-[11.5px] text-faint">
                                under {row.parent.name}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <code className="text-[12px] text-muted">{row.slug}</code>
                      </Td>
                      <Td className="text-right tabular-nums">
                        {row._count.opportunities}
                      </Td>
                      <Td className="text-center">
                        <ToggleForm
                          action={toggleCategoryActiveAction}
                          id={row.id}
                          on={row.active}
                          label={row.active ? "Active" : "Inactive"}
                        />
                      </Td>
                      <Td className="text-center">
                        <FlagForm id={row.id} flag="featured" on={row.featured} />
                      </Td>
                      <Td className="text-center">
                        <FlagForm
                          id={row.id}
                          flag="showOnHomepage"
                          on={row.showOnHomepage}
                        />
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[12px] text-muted tabular-nums">
                            {row.displayOrder}
                          </span>
                          <ReorderButton id={row.id} direction="up" />
                          <ReorderButton id={row.id} direction="down" />
                        </div>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/categories/${row.id}`}
                            className="grid size-7 place-items-center rounded-[6px] border border-line text-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
                            aria-label={`Edit ${row.name}`}
                          >
                            <Pencil className="size-3.5" strokeWidth={1.6} />
                          </Link>
                          {admin.role === "SUPER_ADMIN" ? (
                            <form action={deleteCategoryAction}>
                              <input type="hidden" name="id" value={row.id} />
                              <button
                                type="submit"
                                className="rounded-[6px] border border-line px-2 py-1 text-[12px] text-muted transition-colors duration-200 hover:border-danger/40 hover:text-danger"
                              >
                                Delete
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-2.5 text-[13.5px]", className)}>{children}</td>;
}

function ToggleForm({
  action,
  id,
  on,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  on: boolean;
  label: string;
}) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-pressed={on}
        className={cn(
          "pill transition-colors duration-200",
          on ? "pill-accent" : "text-faint",
        )}
      >
        {label}
      </button>
    </form>
  );
}

function FlagForm({
  id,
  flag,
  on,
}: {
  id: string;
  flag: "featured" | "showOnHomepage";
  on: boolean;
}) {
  return (
    <form action={toggleCategoryFlagAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="flag" value={flag} />
      <button
        type="submit"
        aria-pressed={on}
        aria-label={`Toggle ${flag}`}
        className={cn(
          "grid size-6 place-items-center rounded-[5px] border text-[12px] transition-colors duration-200",
          on
            ? "border-ink bg-ink text-accent"
            : "border-line text-faint hover:border-line-strong",
        )}
      >
        {on ? "✓" : "–"}
      </button>
    </form>
  );
}

function ReorderButton({
  id,
  direction,
}: {
  id: string;
  direction: "up" | "down";
}) {
  const Arrow = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <form action={reorderCategoryAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
      <button
        type="submit"
        aria-label={`Move ${direction}`}
        className="grid size-6 place-items-center rounded-[5px] border border-line text-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
      >
        <Arrow className="size-3" strokeWidth={1.8} />
      </button>
    </form>
  );
}
