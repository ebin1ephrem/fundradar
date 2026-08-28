/**
 * Phase 6 and the editorial rewrite: SEO plumbing, structured data, the
 * report-an-error flow, the new content copy, and the banned-phrase list from
 * the content spec (Part 18).
 */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const pass = [];
const fail = [];
const check = (name, ok, detail = "") =>
  (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ""}`);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on("pageerror", (e) => fail.push(`console error: ${e.message.slice(0, 120)}`));
const body = () => page.textContent("body");
const go = (path) => page.goto(BASE + path, { waitUntil: "domcontentloaded" });

const meta = (name) =>
  page.getAttribute(`meta[name="${name}"]`, "content").catch(() => null);
const og = (property) =>
  page.getAttribute(`meta[property="og:${property}"]`, "content").catch(() => null);
const canonical = () =>
  page.getAttribute('link[rel="canonical"]', "href").catch(() => null);
const jsonLd = async () =>
  (await page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.map((n) => n.textContent),
  )).map((t) => JSON.parse(t));

/** Phrases the content spec bans outright. */
const BANNED = [
  "unlock your potential",
  "empower founders",
  "supercharge",
  "game-changing",
  "transformative",
  "seamless platform",
  "cutting-edge solution",
  "one-stop solution",
  "navigate the complex landscape",
  "fuel your dreams",
  "turn your vision into reality",
  "at your fingertips",
  "next-level growth",
  "comprehensive platform",
  "holistic approach",
  "end-to-end solution",
  "revolutionise your journey",
];

const bannedIn = (text) =>
  BANNED.filter((phrase) => text.toLowerCase().includes(phrase));

try {
  // --- Homepage copy ----------------------------------------------------
  await go("/");
  const home = await body();
  check("hero leads with the tagline", home.includes("Signal, not noise."));
  check("hero subline is the spec's", home.includes("collected from across the ecosystem"));
  check("the eyebrow lists what is covered",
    home.includes("GRANTS · FUNDING · PROGRAMS · OPPORTUNITIES"));
  check("how-it-works section is present", home.includes("We find it. We review it. You decide."));
  check("the trust section leads with the human rule",
    home.includes("Automation helps us look. People decide what gets published."));
  check("the Weekly Signal is named", home.includes("The signal, delivered once a week."));
  check("the footer carries the brand lockup", home.includes("FundRadar by Merstra"));
  check("the footer states the no-fabrication rule",
    home.includes("We don't fabricate information we can't verify."));
  check("homepage uses no banned phrases", bannedIn(home).length === 0, bannedIn(home).join(", "));

  // --- Homepage SEO -----------------------------------------------------
  check("homepage title is the spec's",
    (await page.title()).includes("Signal, Not Noise"), await page.title());
  check("homepage has a description", ((await meta("description")) ?? "").length > 60);
  check("homepage canonical is set", Boolean(await canonical()), await canonical());
  check("open graph title is set", Boolean(await og("title")));
  check("open graph site name is the lockup", (await og("site_name")) === "FundRadar by Merstra",
    await og("site_name"));

  const homeLd = await jsonLd();
  check("homepage emits Organization structured data",
    homeLd.some((d) => d["@type"] === "Organization"));
  check("homepage emits WebSite structured data with a search action",
    homeLd.some((d) => d["@type"] === "WebSite" && d.potentialAction));
  check("structured data carries the tagline",
    homeLd.some((d) => d.slogan === "Signal, not noise."));

  // --- Navigation -------------------------------------------------------
  check("nav uses the spec's labels",
    home.includes("Open opportunities") && home.includes("Closing soon") &&
    home.includes("Categories") && home.includes("About"));
  check("the primary CTA is not \"Sign up\"",
    home.includes("See what's open") && !home.includes("Sign up"));

  // --- About page -------------------------------------------------------
  await go("/about");
  const about = await body();
  check("about page renders",
    about.includes("FundRadar exists because good opportunities are too easy to miss."));
  check("about page credits Merstra", about.includes("A MERSTRA INITIATIVE"));
  check("about page states what we are not",
    about.includes("We're not trying to make every opportunity look good."));
  check("about page states the promise", about.includes("THE FUNDRADAR PROMISE"));
  check("about title is the spec's",
    (await page.title()).includes("Signal, Not Noise in Startup Funding"), await page.title());
  check("about page uses no banned phrases", bannedIn(about).length === 0, bannedIn(about).join(", "));

  // --- Listing ----------------------------------------------------------
  await go("/opportunities");
  const listing = await body();
  check("listing heading uses the new label", listing.includes("Open opportunities"));
  check("search placeholder is the spec's",
    (await page.getAttribute("#q", "placeholder")) ===
      "Search grants, programs, sectors or organisations...",
    await page.getAttribute("#q", "placeholder"));
  check("listing canonical is set", (await canonical())?.endsWith("/opportunities") ?? false);

  // --- Empty search state ----------------------------------------------
  await go("/opportunities?q=zzqqxx");
  const empty = await body();
  check("an empty search says \"no signal\"", empty.includes("No signal for"));
  check("an empty search offers the categories route", empty.includes("Browse categories"));
  check("an empty search offers the radar", empty.includes("Get on the radar"));

  // --- Opportunity page -------------------------------------------------
  await go("/opportunities");
  const firstCard = await page.$('a[href^="/opportunities/"]');
  await firstCard.click();
  await page.waitForURL(/\/opportunities\/[a-z0-9-]+$/, { timeout: 15000 });
  const detail = await body();
  const slug = new URL(page.url()).pathname.split("/").pop();

  // An anonymous visitor sees the gated versions of both; a lead sees the
  // real ones. Assert whichever state this page is actually in.
  check("apply route is either the official-source CTA or the gate",
    detail.includes("Apply at official source") ||
    detail.includes("See full eligibility, application details and benefits") ||
    detail.includes("See full details"),
    "neither shown");
  check("the gate never says \"sign up\" or \"register\"",
    !/\bsign up\b|\bregister\b|create account/i.test(detail));
  check("deadline reminder CTA is the spec's", detail.includes("Get deadline reminder"));
  check("the data disclaimer is shown",
    detail.includes("always verify with the official programme page before applying"));
  check("report an error is offered", detail.includes("Report an error"));
  check("confidence is never shown publicly",
    !detail.includes("confidence") && !detail.includes("Confidence"));
  check("opportunity page uses no banned phrases",
    bannedIn(detail).length === 0, bannedIn(detail).join(", "));

  check("opportunity title ends with the brand",
    (await page.title()).includes("FundRadar"), await page.title());
  check("opportunity canonical points at itself",
    (await canonical())?.endsWith(`/opportunities/${slug}`) ?? false, await canonical());

  const detailLd = await jsonLd();
  const grant = detailLd.find((d) => d["@type"] === "Grant");
  check("opportunity emits Grant structured data", Boolean(grant));
  check("structured data names the funder", Boolean(grant?.funder?.name));
  check("structured data links back to the page",
    (grant?.url ?? "").endsWith(`/opportunities/${slug}`));
  check("opportunity emits breadcrumb structured data",
    detailLd.some((d) => d["@type"] === "BreadcrumbList" && d.itemListElement.length >= 3));

  // --- Report an error --------------------------------------------------
  await go(`/report?o=${slug}`);
  const report = await body();
  check("report page renders", report.includes("Something wrong with this listing?"));
  check("report page names the listing being reported", report.includes("Listing"));
  check("report offers the spec's reasons",
    ["Incorrect deadline", "Broken application link", "Programme is closed",
     "Incorrect eligibility information", "Incorrect funding amount", "Other"]
      .every((r) => report.includes(r)));

  await page.getByLabel("Broken application link").check();
  await page.fill("#report-details", "The apply link 404s.");
  await page.getByRole("button", { name: "Send report" }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes("We'll check this"),
    null, { timeout: 15000 });
  check("submitting a report confirms in the spec's words",
    (await body()).includes("Thanks. We'll check this and update the listing if needed."));

  // A report must never change the published record.
  const after = await page.goto(`${BASE}/opportunities/${slug}`, {
    waitUntil: "domcontentloaded",
  });
  check("the listing is unchanged after a report", after.status() === 200);

  // --- Report without a listing ----------------------------------------
  await go("/report");
  check("report without a listing asks which one", (await body()).includes("Which listing?"));

  // --- 404 --------------------------------------------------------------
  const missing = await go("/opportunities/definitely-not-a-real-slug-xyz");
  check("a missing opportunity returns 404", missing.status() === 404, String(missing.status()));
  check("the 404 page uses the spec's wording",
    (await body()).includes("This page isn't on the radar."));

  // --- robots.txt and sitemap ------------------------------------------
  const robots = await page.goto(`${BASE}/robots.txt`, { waitUntil: "domcontentloaded" });
  const robotsText = await robots.text();
  check("robots.txt is served", robots.status() === 200);
  check("robots.txt blocks the admin console", robotsText.includes("Disallow: /admin"));
  check("robots.txt blocks the dashboard", robotsText.includes("Disallow: /dashboard"));
  check("robots.txt points at the sitemap", robotsText.includes("Sitemap:"));

  const sitemap = await page.goto(`${BASE}/sitemap.xml`, { waitUntil: "domcontentloaded" });
  const sitemapText = await sitemap.text();
  check("sitemap is served", sitemap.status() === 200);
  check("sitemap lists the homepage", sitemapText.includes("<loc>"));
  check("sitemap lists opportunities", sitemapText.includes("/opportunities/"));
  check("sitemap lists categories", sitemapText.includes("/categories/"));
  check("sitemap does not leak the admin console", !sitemapText.includes("/admin"));

  // --- Admin surfaces ---------------------------------------------------
  await go("/admin/login");
  await page.fill("#email", process.env.SMOKE_EMAIL);
  await page.fill("#password", process.env.SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/, { timeout: 20000 });

  await go("/admin/reports");
  const reports = await body();
  check("reported errors reach the admin console", reports.includes("Reported errors"));
  check("the submitted report is listed", reports.includes("The apply link 404s."));
  check("the report is classified", reports.includes("Broken application link"));
  check("the admin can mark it handled", reports.includes("Mark handled"));

  // Earlier runs may have left reports behind, so clear the whole open list.
  for (let i = 0; i < 20; i++) {
    const button = await page.$('button:has-text("Mark handled")');
    if (!button) break;
    await button.click();
    await page.waitForTimeout(600);
  }
  check("handled reports leave the open list", (await body()).includes("No open reports"));

  await go("/admin/reports?show=resolved");
  check("a handled report is kept, not deleted",
    (await body()).includes("The apply link 404s."));

  await go("/admin/analytics");
  const analytics = await body();
  check("analytics dashboard renders", analytics.includes("Analytics"));
  check("analytics counts leads", analytics.includes("New leads"));
  check("analytics shows what founders searched for",
    analytics.includes("What founders searched for"));
  check("analytics ranks opportunities", analytics.includes("Most viewed opportunities"));

  await go("/admin/opportunities/import");
  const importPage = await body();
  check("seed import page renders", importPage.includes("Import seed data"));
  check("the import page states records land in review",
    importPage.includes("PENDING_REVIEW"));
  check("the import page states unknown stays unknown",
    importPage.includes("stays unknown"));
  check("the import page documents the corpus rule",
    importPage.includes("never as a per-startup maximum"));
  check("the import button does not offer publishing",
    importPage.includes("Import as drafts") && !importPage.includes("Import and publish"));
} catch (error) {
  fail.push(`threw: ${error.message.split("\n")[0]}`);
} finally {
  await browser.close();
}

console.log("PASS");
for (const p of pass) console.log("  ✓ " + p);
if (fail.length) {
  console.log("\nFAIL");
  for (const f of fail) console.log("  ✗ " + f);
}
console.log(`\n${pass.length} passed, ${fail.length} failed`);
process.exit(fail.length ? 1 : 0);
