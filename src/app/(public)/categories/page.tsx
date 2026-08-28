import type { Metadata } from "next";
import Link from "next/link";
import type { CategoryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { search } from "@/lib/search";
import { Icon } from "@/components/admin/icon";
import { CATEGORY_TYPE_HINT, CATEGORY_TYPE_LABEL } from "@/lib/validation/category";
import { brand, home, seo } from "@/content/copy";

export const metadata: Metadata = {
  title: seo.categories.title,
  description: seo.categories.description,
  alternates: { canonical: "/categories" },
  openGraph: {
    title: seo.categories.title,
    description: seo.categories.description,
    url: "/categories",
    siteName: brand.lockup,
    type: "website",
  },
};

export const dynamic = "force-dynamic";

const ORDER: CategoryType[] = [
  "OPPORTUNITY_TYPE",
  "INDUSTRY",
  "STARTUP_STAGE",
  "FOUNDER_TYPE",
  "GEOGRAPHY",
  "PROVIDER_TYPE",
];

export default async function CategoriesIndexPage() {
  const categories = await prisma.category.findMany({
    where: {
      active: true,
      NOT: { slug: { contains: "subsid", mode: "insensitive" } },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      description: true,
      categoryType: true,
      parentId: true,
    },
  });

  const counts = await search.facets({}, categories.map((c) => c.slug));

  return (
    <>
      <div className="border-b border-line">
        <div className="page-shell py-12 lg:py-16">
          <p className="eyebrow">{home.categories.eyebrow}</p>
          <h1 className="display-lg mt-3 max-w-[18ch]">
            {home.categories.headline}
          </h1>
          <p className="lede mt-4 max-w-[58ch]">
            {home.categories.subline}
          </p>
        </div>
      </div>

      <div className="page-shell py-10 lg:py-14">
        <div className="grid gap-14">
          {ORDER.map((dimension) => {
            const parents = categories.filter(
              (c) => c.categoryType === dimension && !c.parentId,
            );
            if (parents.length === 0) return null;

            return (
              <section key={dimension}>
                <div className="mb-6 max-w-[60ch]">
                  <h2 className="display-md">{CATEGORY_TYPE_LABEL[dimension]}</h2>
                  <p className="mt-1.5 text-[14.5px] text-muted">
                    {CATEGORY_TYPE_HINT[dimension]}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {parents.map((parent) => {
                    const children = categories.filter((c) => c.parentId === parent.id);
                    const count = counts.get(parent.slug) ?? 0;

                    return (
                      <div
                        key={parent.id}
                        className="group rounded-[12px] border border-line p-5 transition-[border-color,transform] duration-200 hover:-translate-y-[2px] hover:border-line-strong"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="grid size-9 place-items-center rounded-[8px] bg-subtle transition-colors duration-200 group-hover:bg-accent">
                            <Icon name={parent.icon} className="size-4" />
                          </span>
                          <span className="text-[12.5px] text-faint tabular-nums">
                            {count}
                          </span>
                        </div>

                        <h3 className="mt-3.5 text-[16px] font-medium tracking-[-0.02em]">
                          <Link href={`/categories/${parent.slug}`}>{parent.name}</Link>
                        </h3>
                        {parent.description ? (
                          <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
                            {parent.description}
                          </p>
                        ) : null}

                        {children.length ? (
                          <div className="mt-3.5 flex flex-wrap gap-1">
                            {children.slice(0, 4).map((child) => (
                              <Link
                                key={child.slug}
                                href={`/categories/${child.slug}`}
                                className="rounded-[5px] border border-line px-1.5 py-0.5 text-[11.5px] text-muted transition-colors duration-200 hover:border-ink hover:text-ink"
                              >
                                {child.name}
                              </Link>
                            ))}
                            {children.length > 4 ? (
                              <span className="px-1 py-0.5 text-[11.5px] text-faint">
                                +{children.length - 4}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
