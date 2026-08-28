"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import type { NavSection } from "./nav";

export function AdminShell({
  sections,
  admin,
  badges,
  children,
}: {
  sections: NavSection[];
  admin: { name: string; email: string; role: string };
  badges: Partial<Record<"reviewQueue", number>>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="min-h-dvh bg-subtle lg:grid lg:grid-cols-[248px_1fr]">
      <header className="flex items-center justify-between border-b border-line bg-canvas px-5 py-3 lg:hidden">
        <Link href="/admin" className="text-[15px] font-medium tracking-[-0.02em]">
          FundRadar <span className="text-muted">console</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid size-9 place-items-center rounded-[6px] border border-line"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </header>

      <aside
        className={cn(
          "border-r border-line bg-canvas lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto",
          open ? "block" : "hidden",
        )}
      >
        <div className="hidden px-5 py-5 lg:block">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.02em]"
          >
            <span className="grid size-7 place-items-center rounded-[6px] bg-ink text-accent">
              <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="8" cy="8" r="2" fill="currentColor" />
              </svg>
            </span>
            FundRadar
          </Link>
          <p className="mt-1 pl-9 text-[11px] tracking-[0.09em] text-faint uppercase">
            Console
          </p>
        </div>

        <nav className="grid gap-6 px-3 pb-6 lg:px-3">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-[0.09em] text-faint uppercase">
                {section.title}
              </p>
              <ul className="grid gap-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const count = item.badge ? badges[item.badge] : undefined;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-[6px] px-2 py-2 text-[13.5px] transition-colors duration-200",
                          active
                            ? "bg-subtle font-medium text-ink"
                            : "text-muted hover:bg-subtle hover:text-ink",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-[5px]",
                            active ? "bg-accent text-ink" : "text-faint",
                          )}
                        >
                          <Icon name={item.icon} className="size-3.5" />
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {count ? (
                          <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10.5px] font-medium text-white tabular-nums">
                            {count}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-line px-5 py-4">
          <p className="truncate text-[13px] font-medium">{admin.name}</p>
          <p className="truncate text-[12px] text-muted">{admin.email}</p>
          <div className="mt-2.5 flex items-center gap-3">
            <Link
              href="/"
              className="text-[12.5px] text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              View site
            </Link>
            <form action="/admin/logout" method="post">
              <button
                type="submit"
                className="text-[12.5px] text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
