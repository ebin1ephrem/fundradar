"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand, nav } from "@/content/copy";

const LINKS = nav.links;

export function SiteHeader({
  signedIn,
  name,
}: {
  signedIn: boolean;
  name: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // "Open opportunities" and "Closing soon" share a pathname, so a link
  // carrying a query is only active when that query is actually applied.
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
          className="shrink-0"
          aria-label={`${brand.name} home`}
        >
          <Image
            src="/fundradar-logo.svg"
            alt={brand.name}
            width={180}
            height={39}
            priority
            className="h-[30px] w-auto sm:h-[34px]"
          />
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
          {signedIn ? (
            <Link
              href="/dashboard"
              className="hidden max-w-[16ch] truncate text-[14.5px] text-muted transition-colors duration-200 hover:text-ink sm:block"
            >
              {name ? name.split(" ")[0] : "Dashboard"}
            </Link>
          ) : null}
          <Link
            href={signedIn ? "/dashboard" : "/opportunities"}
            className="btn btn-primary btn-sm"
          >
            {signedIn ? nav.dashboardCta : nav.primaryCta}
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
            {(signedIn
              ? [...LINKS, { href: "/dashboard", label: nav.dashboardCta }]
              : LINKS
            ).map((link) => (
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
