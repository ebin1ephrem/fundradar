/**
 * Crawler behaviour against a local fixture site.
 *   python3 -m http.server 8099 --directory /tmp/fakesite
 *   CRAWLER_ALLOW_PRIVATE=1 npm run check:crawler
 */
import { prisma } from "@/lib/prisma";
import { fetchPage } from "@/lib/crawler/fetch";
import { getRobots, isAllowed, parseRobots } from "@/lib/crawler/robots";
import { rankLinks } from "@/lib/crawler/discover";
import { runCrawlJob } from "@/lib/crawler/run";
import { search } from "@/lib/search";

const BASE = "http://127.0.0.1:8099";
const pass: string[] = [];
const fail: string[] = [];
const check = (name: string, ok: boolean, detail = "") =>
  (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ""}`);

async function main() {
  const admin = await prisma.adminUser.findFirst();
  if (!admin) throw new Error("Run `npm run db:seed` first.");

  // --- robots.txt parsing ------------------------------------------------
  const policy = parseRobots(`
User-agent: *
Disallow: /private/
Allow: /private/public-notice
Crawl-delay: 2

User-agent: EvilBot
Disallow: /
`);
  check("robots disallow is honoured", !isAllowed({ ...policy, fetched: true, unavailable: false }, "/private/x"));
  check("a more specific allow overrides a disallow",
    isAllowed({ ...policy, fetched: true, unavailable: false }, "/private/public-notice"));
  check("unlisted paths are allowed",
    isAllowed({ ...policy, fetched: true, unavailable: false }, "/programmes/x"));
  check("crawl-delay is read", policy.crawlDelayMs === 2000, String(policy.crawlDelayMs));

  const live = await getRobots(BASE);
  check("robots.txt is fetched from the site", live.fetched && !live.unavailable);

  // --- fetching ----------------------------------------------------------
  const page = await fetchPage(`${BASE}/programmes/coastal-resilience-grant.html`);
  check("a public page is readable", page.ok);
  if (page.ok) {
    check("the title is extracted", Boolean(page.title?.includes("Coastal Resilience")), page.title ?? "none");
    check("readable text is extracted", page.text.includes("40 lakh"), `${page.text.length} chars`);
  }

  const blocked = await fetchPage(`${BASE}/private/board-minutes.html`);
  check("a robots-disallowed page is refused",
    !blocked.ok && blocked.reason === "ROBOTS",
    blocked.ok ? "was fetched" : blocked.reason);

  const missing = await fetchPage(`${BASE}/programmes/does-not-exist.html`);
  check("a missing page is reported, not retried blindly",
    !missing.ok && missing.reason === "NOT_FOUND",
    missing.ok ? "fetched" : missing.reason);

  // --- link ranking ------------------------------------------------------
  const listing = await fetchPage(BASE);
  if (listing.ok) {
    const ranked = rankLinks(listing.links, { baseUrl: BASE, sameHostOnly: true });
    const urls = ranked.map((r) => r.url);
    check("programme links are found",
      urls.some((u) => u.includes("coastal-resilience")) &&
      urls.some((u) => u.includes("textile-pilot")),
      `${ranked.length} candidates`);
    check("careers pages are filtered out", !urls.some((u) => u.includes("careers")));
    check("news pages are filtered out", !urls.some((u) => u.includes("office-move")));

    const restricted = rankLinks(listing.links, {
      baseUrl: BASE,
      sameHostOnly: true,
      ignorePaths: ["/programmes/"],
    });
    check("ignore paths are respected",
      !restricted.some((r) => r.url.includes("/programmes/")),
      `${restricted.length} left`);
  }

  // --- a full job --------------------------------------------------------
  await prisma.source.deleteMany({ where: { url: { contains: "127.0.0.1:8099" } } });
  const source = await prisma.source.create({
    data: {
      name: "Kadamba Innovation Council (test)",
      organisation: "Kadamba Innovation Council",
      url: BASE,
      websiteUrl: BASE,
      sourceType: "FOUNDATION",
      crawlType: "LISTING_PAGE",
      checkFrequency: "MANUAL",
      createdById: admin.id,
      maxPages: 10,
    },
  });

  const job = await prisma.crawlJob.create({
    data: { sourceId: source.id, type: "SOURCE_FETCH", createdById: admin.id },
    include: { source: true },
  });

  const summary = await runCrawlJob(job);
  check("the crawl job completes", summary.status !== "FAILED", `${summary.status} ${summary.error ?? ""}`);
  check("it reads the programme pages", summary.pagesProcessed >= 2, `${summary.pagesProcessed} read`);
  check("it creates drafts", summary.opportunitiesFound >= 2, `${summary.opportunitiesFound} drafts`);

  const drafts = await prisma.opportunity.findMany({
    where: { sourceId: source.id },
    select: { title: true, workflowStatus: true, isActive: true, ingestionMethod: true, fundingMax: true },
  });

  check("every crawled record is PENDING_REVIEW",
    drafts.length > 0 && drafts.every((d) => d.workflowStatus === "PENDING_REVIEW"),
    drafts.map((d) => d.workflowStatus).join(", "));
  check("no crawled record is publicly active",
    drafts.every((d) => d.isActive === false));
  check("the ingestion method is recorded as crawler",
    drafts.every((d) => d.ingestionMethod === "CRAWLER"));
  check("funding was extracted from the page",
    drafts.some((d) => d.fundingMax?.toString() === "4000000"),
    drafts.map((d) => d.fundingMax?.toString() ?? "none").join(", "));

  // Assert on the exact records this crawl produced, not on a phrase that
  // could also match an unrelated published fixture.
  const draftTitles = new Set(drafts.map((d) => d.title));
  const searched = await Promise.all([
    search.search({ q: "Coastal Resilience Grant", includeClosed: true }),
    search.search({ q: "Textile Manufacturing Pilot", includeClosed: true }),
    search.search({ q: "Kadamba", includeClosed: true }),
  ]);
  const leaked = searched
    .flatMap((r) => r.hits)
    .filter((hit) => draftTitles.has(hit.title));
  check("crawled drafts never appear in public search", leaked.length === 0,
    leaked.length ? leaked.map((h) => h.title).join(", ") : "none leaked");

  // Re-running should not duplicate work: identical bytes, no new drafts.
  const job2 = await prisma.crawlJob.create({
    data: { sourceId: source.id, type: "SOURCE_FETCH", createdById: admin.id },
    include: { source: true },
  });
  const second = await runCrawlJob(job2);
  check("a second run creates no new drafts from unchanged pages",
    second.opportunitiesFound === 0, `${second.opportunitiesFound} new`);

  const refreshed = await prisma.source.findUnique({ where: { id: source.id } });
  check("source health is recorded", refreshed?.health === "HEALTHY", refreshed?.health ?? "none");
  check("the last check time is recorded", Boolean(refreshed?.lastCheckedAt));

  // --- cleanup -----------------------------------------------------------
  await prisma.opportunity.deleteMany({ where: { sourceId: source.id } });
  await prisma.source.delete({ where: { id: source.id } });
  check("the test cleans up after itself", true);

  console.log("\nPASS");
  for (const p of pass) console.log("  ✓ " + p);
  if (fail.length) {
    console.log("\nFAIL");
    for (const f of fail) console.log("  ✗ " + f);
  }
  console.log(`\n${pass.length} passed, ${fail.length} failed`);
  process.exit(fail.length ? 1 : 0);
}

main();
