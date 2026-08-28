import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brand } from "@/content/copy";

const EXPLORE = [
  { href: "/opportunities", label: "Open opportunities" },
  { href: "/opportunities?closing=7", label: "Closing Soon" },
  { href: "/categories", label: "Categories" },
  { href: "/opportunities", label: "Search" },
];

const COMPANY = [
  { href: "/about", label: "About" },
  { href: "/about#how-it-works", label: "How it works" },
  { href: "/report", label: "Report an error" },
];

export async function SiteFooter() {
  const categories = await prisma.category.findMany({
    where: {
      active: true,
      parentId: null,
      featured: true,
      categoryType: "OPPORTUNITY_TYPE",
      NOT: { slug: { contains: "subsid", mode: "insensitive" } },
    },
    orderBy: { displayOrder: "asc" },
    select: { name: true, slug: true },
    take: 6,
  });

  return (
    <footer className="border-t border-line bg-subtle">
      <div className="page-shell py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-[34ch]">
            <p className="flex items-center gap-2 text-[16px] font-medium tracking-[-0.025em]">
              <span className="grid size-7 place-items-center rounded-[6px] bg-ink text-accent">
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="8" cy="8" r="2" fill="currentColor" />
                </svg>
              </span>
              {brand.lockup}
            </p>
            <p className="mt-2 text-[14px] text-muted">{brand.tagline}</p>
            <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
              {brand.trustLine}
            </p>
          </div>

          <FooterColumn title="Explore" items={EXPLORE} />
          <FooterColumn
            title="Categories"
            items={[
              ...categories.map((c) => ({
                href: `/categories/${c.slug}`,
                label: c.name,
              })),
              { href: "/categories", label: "All categories" },
            ]}
          />
          <FooterColumn title="Company" items={COMPANY} />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-[12.5px] text-muted">
            © {new Date().getFullYear()} {brand.lockup}. Programme details can
            change. Check the official programme page before applying.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={`${item.href}-${item.label}`}>
            <Link
              href={item.href}
              className="text-[14px] text-muted transition-colors duration-200 hover:text-ink"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
