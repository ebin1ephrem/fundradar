import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/** Appends -2, -3 … until the slug is free. `exists` does the lookup. */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "item";
  if (!(await exists(root))) return root;
  for (let i = 2; i < 200; i += 1) {
    const candidate = `${root}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now()}`;
}

const COMPACT_INR = [
  { limit: 1_00_00_000, suffix: "Cr", divisor: 1_00_00_000 },
  { limit: 1_00_000, suffix: "L", divisor: 1_00_000 },
  { limit: 1_000, suffix: "K", divisor: 1_000 },
];

/** ₹50,00,000 -> "₹50L". Non-INR uses K/M/B. */
export function formatMoney(
  amount: number | string | null | undefined,
  currency = "INR",
): string | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return null;
  const symbol = currencySymbol(currency);
  if (n === 0) return `${symbol}0`;

  if (currency === "INR") {
    for (const step of COMPACT_INR) {
      if (n >= step.limit) {
        return `${symbol}${trimZeros(n / step.divisor)}${step.suffix}`;
      }
    }
    return `${symbol}${n.toLocaleString("en-IN")}`;
  }

  if (n >= 1_000_000_000) return `${symbol}${trimZeros(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${symbol}${trimZeros(n / 1_000_000)}M`;
  if (n >= 1_000) return `${symbol}${trimZeros(n / 1_000)}K`;
  return `${symbol}${n.toLocaleString("en-US")}`;
}

function trimZeros(n: number): string {
  return Number(n.toFixed(2)).toString();
}

export function currencySymbol(currency: string): string {
  const map: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    SGD: "S$",
    AUD: "A$",
    CHF: "CHF ",
    JPY: "¥",
    AED: "AED ",
  };
  return map[currency] ?? `${currency} `;
}

export function fundingRangeLabel(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
  currency = "INR",
  fallback?: string | null,
): string {
  const lo = formatMoney(min, currency);
  const hi = formatMoney(max, currency);
  if (lo && hi) return lo === hi ? lo : `${lo} – ${hi}`;
  if (hi) return `Up to ${hi}`;
  if (lo) return `From ${lo}`;
  return fallback?.trim() || "Not specified by provider";
}

export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const target = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(target.getTime())) return null;
  const startOfDay = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round(
    (startOfDay(target) - startOfDay(new Date())) / 86_400_000,
  );
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Not specified";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "Not specified";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const NOT_SPECIFIED = "Not specified by provider";
