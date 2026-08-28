import type { AdminRole } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** Badge counter key resolved by the shell (e.g. pending review count). */
  badge?: "reviewQueue";
  superAdminOnly?: boolean;
};

export type NavSection = { title: string; items: NavItem[] };

/**
 * Grows as phases land. Keep every entry pointing at a route that exists —
 * a dead link in the console is worse than a missing one.
 */
export const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: "LayoutDashboard" }],
  },
  {
    title: "Funding database",
    items: [
      { href: "/admin/opportunities", label: "Opportunities", icon: "Banknote" },
      { href: "/admin/categories", label: "Categories", icon: "Tags" },
    ],
  },
  {
    title: "Startups",
    items: [{ href: "/admin/leads", label: "Leads", icon: "Users" }],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/settings", label: "Settings", icon: "Wrench" },
      { href: "/admin/audit", label: "Audit log", icon: "ScrollText" },
      {
        href: "/admin/team",
        label: "Admin users",
        icon: "Shield",
        superAdminOnly: true,
      },
    ],
  },
];

export function visibleNav(role: AdminRole): NavSection[] {
  return NAV.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.superAdminOnly || role === "SUPER_ADMIN",
    ),
  })).filter((section) => section.items.length > 0);
}
