import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function SiteFooter() {
  const columns = await prisma.category.findMany({
    where: { active: true, parentId: null, featured: true },
    orderBy: [{ categoryType: "asc" }, { displayOrder: "asc" }],
    select: { name: true, slug: true, categoryType: true },
    take: 18,
  });

  const types = columns.filter((c) => c.categoryType === "OPPORTUNITY_TYPE").slice(0, 7);
  const industries = columns.filter((c) => c.categoryType === "INDUSTRY").slice(0, 7);
  const others = columns
    .filter((c) => !["OPPORTUNITY_TYPE", "INDUSTRY"].includes(c.categoryType))
    .slice(0, 7);

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
              FundRadar
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-muted">
              Grants, incubation programmes, accelerators and competitions for
              startups. Every opportunity links to its official source, and
              every record is checked by a person before it is published.
            </p>
          </div>

          <FooterColumn title="Funding types" items={types} />
          <FooterColumn title="Industries" items={industries} />
          <FooterColumn title="More" items={others} />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-[12.5px] text-muted">
            © {new Date().getFullYear()} FundRadar. Information is compiled from
            publicly available official sources — always confirm details on the
            provider&apos;s own page before applying.
          </p>
          <div className="flex gap-5 text-[12.5px] text-muted">
            <Link href="/opportunities" className="hover:text-ink">
              All opportunities
            </Link>
            <Link href="/categories" className="hover:text-ink">
              All categories
            </Link>
          </div>
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
  items: { name: string; slug: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/categories/${item.slug}`}
              className="text-[14px] text-muted transition-colors duration-200 hover:text-ink"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
