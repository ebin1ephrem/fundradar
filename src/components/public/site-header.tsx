"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/opportunities", label: "Browse" },
  { href: "/categories", label: "Categories" },
  { href: "/opportunities?closing=7", label: "Closing soon" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // "Browse" and "Closing soon" share a pathname, so a link carrying a query
  // is only active when that query is actually applied.
  const isActive = (href: string) => {
    const [path, query] = href.split("?");
    if (pathname !== path) return false;
    if (!query) return searchParams.size === 0;
    return [...new URLSearchParams(query)].every(
      ([key, value]) => searchParams.get(key) === value,
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="page-shell flex h-[68px] items-center justify-between gap-6 lg:h-[72px]">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-[16px] font-medium tracking-[-0.025em]"
        >
          <span className="grid size-7 place-items-center rounded-[6px] bg-ink text-accent">
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
              <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="8" cy="8" r="2" fill="currentColor" />
            </svg>
          </span>
          FundRadar
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative text-[14.5px] transition-colors duration-200",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {link.label}
                {active ? (
                  <span className="absolute -bottom-1.5 left-0 h-[2px] w-full rounded-full bg-accent" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/opportunities" className="btn btn-primary btn-sm">
            Find funding
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-9 place-items-center rounded-[6px] border border-line md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="page-shell border-t border-line py-3 md:hidden" aria-label="Main">
          <ul className="grid gap-0.5">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-[6px] px-2 py-2.5 text-[15px] text-muted hover:bg-subtle hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
