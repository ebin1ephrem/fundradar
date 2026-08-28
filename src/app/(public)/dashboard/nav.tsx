"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/saved", label: "Saved" },
  { href: "/dashboard/alerts", label: "Alerts" },
  { href: "/dashboard/profile", label: "Profile" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="-mb-px mt-7 flex gap-1 overflow-x-auto" aria-label="Dashboard">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3.5 py-2.5 text-[14px] whitespace-nowrap transition-colors duration-200",
              active
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
