import "server-only";

/** Words that make a link worth fetching. */
const RELEVANT = [
  "funding", "fund", "grant", "grants", "startup", "startups", "application",
  "applications", "apply", "programme", "program", "scheme", "incubation",
  "incubator", "accelerator", "acceleration", "challenge", "competition",
  "award", "fellowship", "seed", "csr", "innovation", "pilot", "call",
  "cohort", "subsidy", "tender", "eoi", "rfp", "market access", "procurement",
];

/** Words that mean a link is almost certainly not an opportunity. */
const IRRELEVANT = [
  "career", "careers", "job", "jobs", "vacancy", "recruitment", "privacy",
  "terms", "cookie", "sitemap", "login", "signin", "sign-in", "register",
  "cart", "checkout", "unsubscribe", "rss", "feed", "gallery", "photo",
  "video", "press-release", "media-coverage", "annual-report", "tender-result",
  "archive", "disclaimer", "accessibility", "contact-us", "about-us",
];

const BAD_EXTENSION = /\.(jpe?g|png|gif|svg|webp|mp4|mp3|zip|rar|docx?|xlsx?|pptx?|css|js)(\?|$)/i;

export type Candidate = {
  url: string;
  text: string;
  score: number;
  reason: string;
};

/**
 * Ranks links from a listing or section page. Scoring on both the URL and the
 * anchor text means "Apply now" and "/schemes/seed-fund" both surface, and a
 * careers page does not.
 */
export function rankLinks(
  links: { url: string; text: string }[],
  options: {
    baseUrl: string;
    sameHostOnly: boolean;
    allowPaths?: string[];
    ignorePaths?: string[];
  },
): Candidate[] {
  const base = safeUrl(options.baseUrl);
  if (!base) return [];

  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const link of links) {
    const url = safeUrl(link.url);
    if (!url) continue;
    if (BAD_EXTENSION.test(url.pathname)) continue;
    if (options.sameHostOnly && url.hostname !== base.hostname) continue;

    const key = url.toString();
    if (seen.has(key)) continue;
    seen.add(key);

    const path = url.pathname.toLowerCase();
    const anchor = link.text.toLowerCase();
    const haystack = `${path} ${anchor}`;

    if (options.ignorePaths?.some((p) => path.startsWith(p.toLowerCase()))) continue;
    if (IRRELEVANT.some((word) => haystack.includes(word))) continue;

    // An explicit allow list is a hard filter, not a hint.
    const allowed =
      !options.allowPaths?.length ||
      options.allowPaths.some((p) => path.startsWith(p.toLowerCase()));
    if (!allowed) continue;

    const hits = RELEVANT.filter((word) => haystack.includes(word));
    if (hits.length === 0) continue;

    const inPath = hits.filter((word) => path.includes(word)).length;
    const score = Math.min(1, hits.length * 0.2 + inPath * 0.2 + (anchor.length > 12 ? 0.1 : 0));

    candidates.push({
      url: key,
      text: link.text,
      score,
      reason: `Matched ${hits.slice(0, 4).join(", ")}`,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}
