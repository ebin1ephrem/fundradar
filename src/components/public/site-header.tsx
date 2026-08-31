"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { brand, nav } from "@/content/copy";

const OPPORTUNITY_LINKS = [
  { group: "Discover", href: "/opportunities", label: "All opportunities", description: "Everything currently on the Radar." },
  { group: "Discover", href: "/opportunities?closing=7", label: "Closing Soon", description: "Opportunities with approaching deadlines." },
  { group: "Discover", href: "/opportunities?sort=newest", label: "New on the Radar", description: "Recently added opportunities." },
  { group: "Explore", href: "/categories", label: "Categories", description: "Browse funding, programmes and startup support by category." },
  { group: "Explore", href: "/opportunities?equityFree=1", label: "Equity-free funding", description: "Funding opportunities that do not require equity." },
  { group: "Explore", href: "/opportunities?provider=GOVERNMENT", label: "Government opportunities", description: "Calls and programmes from government organisations." },
] as const;

export function SiteHeader({ signedIn, name }: { signedIn: boolean; name: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const rootRef = useRef<HTMLElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const opportunityButtonRef = useRef<HTMLButtonElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileOpportunitiesOpen, setMobileOpportunitiesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled((current) => {
        const next = window.scrollY > 12;
        return current === next ? current : next;
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
  }, [pathname, query]);

  useEffect(() => {
    if (!megaOpen && !mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (mobileOpen) {
        setMobileOpen(false);
        mobileButtonRef.current?.focus();
      }
      if (megaOpen) {
        setMegaOpen(false);
        opportunityButtonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMegaOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [megaOpen, mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    const [path, hrefQuery] = href.split("?");
    if (pathname !== path) return false;
    if (!hrefQuery) return searchParams.size === 0;
    return [...new URLSearchParams(hrefQuery)].every(
      ([key, value]) => searchParams.get(key) === value,
    );
  };

  return (
    <header ref={rootRef} className={cn("site-header sticky top-0 z-50", scrolled && "is-scrolled")}>
      <div className="site-header-bar">
        <div className="page-shell flex h-[66px] items-center justify-between gap-5 lg:h-[74px]">
          <Link href="/" className="shrink-0" aria-label={`${brand.name} home`}>
            <Image src="/fundradar-logo.svg" alt={brand.name} width={180} height={39} priority className="h-[30px] w-auto sm:h-[34px]" />
          </Link>

          <nav className="hidden items-stretch gap-7 self-stretch lg:flex" aria-label="Main">
            <button
              ref={opportunityButtonRef}
              type="button"
              aria-haspopup="true"
              aria-expanded={megaOpen}
              aria-controls="opportunities-mega-menu"
              onClick={() => setMegaOpen((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || (event.key === "Tab" && megaOpen && !event.shiftKey)) {
                  event.preventDefault();
                  setMegaOpen(true);
                  requestAnimationFrame(() => {
                    megaMenuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
                  });
                }
              }}
              className={cn("nav-link nav-link-button", pathname === "/opportunities" && "is-active")}
            >
              Opportunities
              <ChevronDown className={cn("size-3.5 transition-transform duration-200", megaOpen && "rotate-180")} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <PrimaryLink href="/categories" active={pathname.startsWith("/categories")}>Categories</PrimaryLink>
            <PrimaryLink href="/about" active={pathname === "/about"}>About</PrimaryLink>
          </nav>

          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link href="/dashboard" className="hidden max-w-[16ch] truncate text-[14px] text-muted transition-colors duration-200 hover:text-ink lg:inline-flex">
                {name ? name.split(" ")[0] : "Dashboard"}
              </Link>
            ) : null}
            <Link href={signedIn ? "/dashboard" : "/opportunities"} className="btn btn-primary btn-sm hidden sm:inline-flex">
              {signedIn ? nav.dashboardCta : nav.primaryCta}
              <ArrowUpRight className="motion-arrow size-3.5" strokeWidth={1.8} />
            </Link>
            <button
              ref={mobileButtonRef}
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="grid size-10 place-items-center rounded-[7px] border border-line bg-canvas lg:hidden"
            >
              {mobileOpen ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={megaMenuRef}
        id="opportunities-mega-menu"
        role="navigation"
        aria-label="Opportunity discovery"
        aria-hidden={!megaOpen}
        onKeyDown={(event) => {
          const firstLink = megaMenuRef.current?.querySelector<HTMLAnchorElement>("a");
          if (event.key === "Tab" && event.shiftKey && event.target === firstLink) {
            event.preventDefault();
            opportunityButtonRef.current?.focus();
          }
        }}
        className={cn("mega-menu hidden lg:block", megaOpen && "is-open")}
      >
        <div className="page-shell grid gap-8 py-8 lg:grid-cols-2 lg:py-9">
          {(["Discover", "Explore"] as const).map((group) => (
            <section key={group} aria-labelledby={`mega-${group.toLowerCase()}`}>
              <p id={`mega-${group.toLowerCase()}`} className="eyebrow mb-2 px-3">{group}</p>
              <div className="grid gap-1">
                {OPPORTUNITY_LINKS.filter((item) => item.group === group).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    tabIndex={megaOpen ? 0 : -1}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    onClick={() => setMegaOpen(false)}
                    className="mega-menu-item group"
                  >
                    <span>
                      <span className="block text-[15px] font-medium tracking-[-0.015em] text-ink">{item.label}</span>
                      <span className="mt-1 block text-[12.5px] leading-relaxed text-muted">{item.description}</span>
                    </span>
                    <ArrowUpRight className="mega-menu-arrow size-4 shrink-0 text-faint" strokeWidth={1.7} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <nav id="mobile-navigation" aria-label="Mobile navigation" aria-hidden={!mobileOpen} className={cn("mobile-navigation lg:hidden", mobileOpen && "is-open")}>
        <div className="page-shell py-5">
          <button
            type="button"
            aria-expanded={mobileOpportunitiesOpen}
            aria-controls="mobile-opportunity-links"
            onClick={() => setMobileOpportunitiesOpen((current) => !current)}
            className="mobile-nav-row w-full"
            tabIndex={mobileOpen ? 0 : -1}
          >
            <span>Opportunities</span>
            <ChevronDown className={cn("size-4 transition-transform duration-200", mobileOpportunitiesOpen && "rotate-180")} strokeWidth={1.8} />
          </button>

          <div
            id="mobile-opportunity-links"
            aria-hidden={!mobileOpportunitiesOpen}
            className={cn("mobile-nav-accordion", mobileOpportunitiesOpen && "is-open")}
          >
            <div className="grid gap-0.5 pb-3 pl-3">
              {OPPORTUNITY_LINKS.map((item) => (
                <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} tabIndex={mobileOpen && mobileOpportunitiesOpen ? 0 : -1} onClick={() => setMobileOpen(false)} className={cn("rounded-[8px] px-3 py-3 text-[14.5px] text-muted transition-colors hover:bg-subtle hover:text-ink", isActive(item.href) && "bg-subtle text-ink")}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <Link href="/categories" aria-current={pathname.startsWith("/categories") ? "page" : undefined} tabIndex={mobileOpen ? 0 : -1} onClick={() => setMobileOpen(false)} className="mobile-nav-row">Categories</Link>
          <Link href="/about" aria-current={pathname === "/about" ? "page" : undefined} tabIndex={mobileOpen ? 0 : -1} onClick={() => setMobileOpen(false)} className="mobile-nav-row">About</Link>
          {signedIn ? <Link href="/dashboard" aria-current={pathname.startsWith("/dashboard") ? "page" : undefined} tabIndex={mobileOpen ? 0 : -1} onClick={() => setMobileOpen(false)} className="mobile-nav-row">Dashboard</Link> : null}

          <Link href={signedIn ? "/dashboard" : "/opportunities"} tabIndex={mobileOpen ? 0 : -1} onClick={() => setMobileOpen(false)} className="btn btn-primary mt-6 w-full">
            {signedIn ? nav.dashboardCta : nav.primaryCta}
            <ArrowUpRight className="motion-arrow size-4" strokeWidth={1.8} />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function PrimaryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={cn("nav-link", active && "is-active")}>{children}</Link>;
}
