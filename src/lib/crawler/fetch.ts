import "server-only";
import * as cheerio from "cheerio";
import { env } from "@/lib/env";
import { canonicaliseUrl } from "@/lib/ingestion/normalise";
import { getRobots, isAllowed } from "./robots";

export type FetchOutcome =
  | {
      ok: true;
      url: string;
      status: number;
      title: string | null;
      text: string;
      html: string;
      links: { url: string; text: string }[];
    }
  | {
      ok: false;
      url: string;
      status: number | null;
      reason: "ROBOTS" | "BLOCKED" | "LOGIN_REQUIRED" | "NOT_FOUND" | "ERROR" | "UNSUPPORTED";
      message: string;
    };

const MAX_BYTES = 4_000_000;
const TIMEOUT_MS = 20_000;

/** Private ranges and loopback, so an admin-supplied URL cannot reach inside. */
const PRIVATE_HOST =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|.*\.local)$/i;

/**
 * Fetches one public page.
 *
 * Refuses anything that would mean going around an access control: a login
 * wall, a paywall, a CAPTCHA, or a robots.txt rule. Those come back as a
 * reason the admin can act on, usually by pasting the text instead.
 */
export async function fetchPage(rawUrl: string): Promise<FetchOutcome> {
  const normalised = canonicaliseUrl(rawUrl);
  if (!normalised) {
    return { ok: false, url: rawUrl, status: null, reason: "UNSUPPORTED", message: "Not a usable URL." };
  }

  const url = new URL(normalised);
  if (!/^https?:$/.test(url.protocol)) {
    return { ok: false, url: normalised, status: null, reason: "UNSUPPORTED", message: "Only http and https are supported." };
  }
  if (PRIVATE_HOST.test(url.hostname) && !env.allowPrivateCrawlTargets) {
    return {
      ok: false,
      url: normalised,
      status: null,
      reason: "BLOCKED",
      message: "That address is on a private network.",
    };
  }

  const robots = await getRobots(url.origin);
  if (!robots.unavailable && !isAllowed(robots, url.pathname)) {
    return {
      ok: false,
      url: normalised,
      status: null,
      reason: "ROBOTS",
      message: "This site's robots.txt asks crawlers not to read this page.",
    };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": env.crawlerUserAgent,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    return {
      ok: false,
      url: normalised,
      status: null,
      reason: "ERROR",
      message: error instanceof Error ? error.message : "The request failed.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      url: normalised,
      status: response.status,
      reason: "LOGIN_REQUIRED",
      message: "The page is behind a sign-in or is blocked to us. We do not attempt to get around that.",
    };
  }
  if (response.status === 404 || response.status === 410) {
    return { ok: false, url: normalised, status: response.status, reason: "NOT_FOUND", message: "The page no longer exists." };
  }
  if (!response.ok) {
    return { ok: false, url: normalised, status: response.status, reason: "ERROR", message: `The site returned ${response.status}.` };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!/text\/html|application\/xhtml/i.test(contentType)) {
    return {
      ok: false,
      url: normalised,
      status: response.status,
      reason: "UNSUPPORTED",
      message: `We can only read web pages, and this is ${contentType.split(";")[0] || "an unknown type"}. Try pasting the text instead.`,
    };
  }

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) {
    return { ok: false, url: normalised, status: response.status, reason: "UNSUPPORTED", message: "The page is too large to read." };
  }

  const html = (await response.text()).slice(0, MAX_BYTES);
  const parsed = extractContent(html, response.url || normalised);

  if (looksLikeWall(parsed.text)) {
    return {
      ok: false,
      url: normalised,
      status: response.status,
      reason: "LOGIN_REQUIRED",
      message: "The page asks for a sign-in or a CAPTCHA before showing content. Paste the text instead.",
    };
  }

  return {
    ok: true,
    url: response.url || normalised,
    status: response.status,
    title: parsed.title,
    text: parsed.text,
    html,
    links: parsed.links,
  };
}

/** Strips chrome and returns readable text plus the links worth following. */
export function extractContent(
  html: string,
  baseUrl: string,
): { title: string | null; text: string; links: { url: string; text: string }[] } {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, form, header nav, footer nav").remove();

  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().trim() ||
    null;

  const main = $("main, article, [role=main], .content, #content").first();
  const scope = main.length ? main : $("body");

  const text = scope
    .find("h1, h2, h3, h4, p, li, td, th, dd, dt")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((line) => line.length > 1)
    .join("\n")
    .slice(0, 200_000);

  const links: { url: string; text: string }[] = [];
  const seen = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) return;
    try {
      const resolved = new URL(href, baseUrl);
      resolved.hash = "";
      const key = resolved.toString();
      if (seen.has(key)) return;
      seen.add(key);
      links.push({ url: key, text: $(el).text().replace(/\s+/g, " ").trim().slice(0, 200) });
    } catch {
      // Unparseable href — skip it.
    }
  });

  return { title: title?.slice(0, 300) ?? null, text, links };
}

function looksLikeWall(text: string): boolean {
  if (text.length > 1500) return false;
  return /(sign in to continue|log ?in to (continue|view)|subscribe to (read|continue)|verify you are human|enable javascript to|complete the captcha)/i.test(
    text,
  );
}

/** Politeness delay between requests to one host. */
export async function politeDelay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
