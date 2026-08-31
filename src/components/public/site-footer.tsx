import Image from "next/image";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CACHE_SECONDS, PUBLIC_CATALOG_TAG } from "@/lib/cache-tags";
import { brand } from "@/content/copy";
import { Reveal } from "@/components/public/motion/reveal";

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

const getFooterCategories = unstable_cache(async () => {
  return prisma.category.findMany({
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
}, ["public-footer-categories-v1"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: [PUBLIC_CATALOG_TAG],
});

export async function SiteFooter() {
  const categories = await getFooterCategories();

  return (
    <footer className="border-t border-line bg-subtle">
      <div className="page-shell py-14 lg:py-20">
        <Reveal className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-[34ch]">
            <Link href="/" aria-label={`${brand.name} home`}>
              <Image
                src="/fundradar-logo.svg"
                alt={brand.name}
                width={200}
                height={43}
                className="h-[38px] w-auto"
              />
            </Link>
            <p className="mt-1 text-[12.5px] text-muted">by {brand.parent}</p>
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
        </Reveal>

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
