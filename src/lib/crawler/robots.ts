import "server-only";
import { env } from "@/lib/env";

type Rule = { path: string; allow: boolean };

export type RobotsPolicy = {
  fetched: boolean;
  /** True when robots.txt could not be read at all — we then assume allowed. */
  unavailable: boolean;
  crawlDelayMs: number | null;
  rules: Rule[];
  sitemaps: string[];
};

const CACHE = new Map<string, { policy: RobotsPolicy; expires: number }>();
const CACHE_MS = 15 * 60_000;

/**
 * Reads robots.txt for an origin and caches it briefly. The most specific
 * matching rule wins, which is what the de-facto standard specifies.
 */
export async function getRobots(origin: string): Promise<RobotsPolicy> {
  const cached = CACHE.get(origin);
  if (cached && cached.expires > Date.now()) return cached.policy;

  let policy: RobotsPolicy = {
    fetched: false,
    unavailable: true,
    crawlDelayMs: null,
    rules: [],
    sitemaps: [],
  };

  try {
    const response = await fetch(new URL("/robots.txt", origin), {
      headers: { "User-Agent": env.crawlerUserAgent },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });

    if (response.status === 404) {
      // No robots.txt means no restrictions.
      policy = { fetched: true, unavailable: false, crawlDelayMs: null, rules: [], sitemaps: [] };
    } else if (response.ok) {
      policy = { ...parseRobots(await response.text()), fetched: true, unavailable: false };
    }
  } catch {
    // Unreachable robots.txt — treated as unavailable, handled by the caller.
  }

  CACHE.set(origin, { policy, expires: Date.now() + CACHE_MS });
  return policy;
}

export function parseRobots(text: string): Omit<RobotsPolicy, "fetched" | "unavailable"> {
  const rules: Rule[] = [];
  const sitemaps: string[] = [];
  let crawlDelayMs: number | null = null;

  // Only groups that apply to us: our own agent, or the wildcard.
  let applies = false;
  let sawSpecific = false;

  for (const line of text.split(/\r?\n/)) {
    const clean = line.split("#")[0].trim();
    if (!clean) continue;

    const [rawField, ...rest] = clean.split(":");
    const field = rawField.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (field === "sitemap") {
      sitemaps.push(value);
      continue;
    }

    if (field === "user-agent") {
      const agent = value.toLowerCase();
      const isUs = agent === "*" || env.crawlerUserAgent.toLowerCase().includes(agent);
      if (agent !== "*" && isUs) {
        // A group naming us specifically replaces anything read from wildcard.
        sawSpecific = true;
        rules.length = 0;
        crawlDelayMs = null;
      }
      applies = isUs && (agent !== "*" || !sawSpecific);
      continue;
    }

    if (!applies) continue;

    if (field === "disallow" && value) rules.push({ path: value, allow: false });
    if (field === "disallow" && !value) rules.push({ path: "/", allow: true });
    if (field === "allow" && value) rules.push({ path: value, allow: true });
    if (field === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0) {
        crawlDelayMs = Math.min(seconds * 1000, 30_000);
      }
    }
  }

  return { rules, crawlDelayMs, sitemaps };
}

export function isAllowed(policy: RobotsPolicy, pathname: string): boolean {
  let best: { length: number; allow: boolean } | null = null;

  for (const rule of policy.rules) {
    if (!matches(rule.path, pathname)) continue;
    const length = rule.path.replace(/\*/g, "").length;
    // Longest match wins; Allow beats Disallow at equal length.
    if (!best || length > best.length || (length === best.length && rule.allow)) {
      best = { length, allow: rule.allow };
    }
  }

  return best ? best.allow : true;
}

function matches(pattern: string, pathname: string): boolean {
  const endAnchored = pattern.endsWith("$");
  const body = endAnchored ? pattern.slice(0, -1) : pattern;
  const regex = new RegExp(
    `^${body
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*")}${endAnchored ? "$" : ""}`,
  );
  return regex.test(pathname);
}
