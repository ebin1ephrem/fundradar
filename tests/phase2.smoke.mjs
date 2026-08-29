import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const pass = [];
const fail = [];
const check = (name, ok, detail = "") =>
  (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ""}`);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage();
page.on("pageerror", (e) => fail.push(`console error: ${e.message.slice(0, 120)}`));
const body = () => page.textContent("body");

try {
  // Homepage -------------------------------------------------------------
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  const home = await body();
  check("homepage renders hero",
    home.includes("Find what could move") &&
    home.includes("your startup forward."));
  check("homepage shows the four homepage categories",
    ["Grants", "Seed Funds", "Incubation Programs", "Acceleration Programs"].every((c) => home.includes(c)));
  check("category counts come from the database", /\d+ opportunities/.test(home));
  check("homepage lists closing-soon programmes", home.includes("Closing Soon"));
  check("homepage explains the founder perspective",
    home.includes("We built FundRadar because we've been on this side of the search."));

  // Search ---------------------------------------------------------------
  await page.fill("#q", "biotec");
  await page.getByRole("button", { name: "Search" }).first().click();
  await page.waitForURL(/\/opportunities\?/, { timeout: 15000 });
  check("typo-tolerant search finds the record",
    (await body()).includes("Helix BioTech Commercialisation Grant"));

  await page.goto(`${BASE}/opportunities?q=women+founder+grants`, { waitUntil: "domcontentloaded" });
  check("multi-word search keeps recall and ranks the best match first",
    (await page.textContent("article")).includes("Meridian Women Founders Accelerator"));

  await page.goto(`${BASE}/opportunities?q=climate`, { waitUntil: "domcontentloaded" });
  check("search matches on category, not just body text",
    (await body()).includes("Vidyut Clean Energy Challenge"));

  // Filters --------------------------------------------------------------
  await page.goto(`${BASE}/opportunities`, { waitUntil: "domcontentloaded" });
  const allCount = Number((await body()).match(/of ([\d,]+)/)?.[1]?.replace(/,/g, "") ?? 0);
  check("directory lists published opportunities", allCount > 0, `${allCount} results`);

  await page.getByRole("link", { name: /^Grants/ }).first().click();
  await page.waitForURL(/c=grants/, { timeout: 15000 });
  const grantsCount = Number((await body()).match(/of ([\d,]+)/)?.[1]?.replace(/,/g, "") ?? 0);
  check("category filter narrows results", grantsCount > 0 && grantsCount <= allCount,
    `${grantsCount} of ${allCount}`);

  await page.goto(`${BASE}/opportunities?equityFree=1`, { waitUntil: "domcontentloaded" });
  check("equity-free filter works", (await body()).includes("Equity-free"));

  await page.goto(`${BASE}/opportunities?state=Kerala`, { waitUntil: "domcontentloaded" });
  check("state filter works", (await body()).includes("Coastal Blue Economy Pilot Programme"));

  await page.goto(`${BASE}/opportunities?closing=7`, { waitUntil: "domcontentloaded" });
  const closing = await body();
  check("deadline filter returns only urgent programmes",
    closing.includes("d left") || closing.includes("Closes today"));

  // Assert the shape of the logic, not fixed counts, so these hold whatever
  // the database contains.
  const countAt = async (query) => {
    await page.goto(`${BASE}/opportunities?${query}`, { waitUntil: "domcontentloaded" });
    return Number((await body()).match(/of ([\d,]+)/)?.[1]?.replace(/,/g, "") ?? 0);
  };
  const grantsOnly = await countAt("c=grants");
  const climateOnly = await countAt("c=climatetech");
  const deeptechOnly = await countAt("c=deeptech");
  const bothDimensions = await countAt("c=grants&c=climatetech");
  const sameDimension = await countAt("c=deeptech&c=climatetech");

  check("filters across dimensions narrow rather than widen",
    bothDimensions <= Math.min(grantsOnly, climateOnly),
    `${grantsOnly} & ${climateOnly} -> ${bothDimensions}`);
  check("filters inside one dimension are alternatives",
    sameDimension >= Math.max(deeptechOnly, climateOnly) &&
    sameDimension <= deeptechOnly + climateOnly,
    `${deeptechOnly} | ${climateOnly} -> ${sameDimension}`);

  // Sorting --------------------------------------------------------------
  await page.goto(`${BASE}/opportunities?sort=largest`, { waitUntil: "domcontentloaded" });
  check("sort by largest funding puts the biggest first",
    (await page.textContent("article")).includes("Arclight Venture Debt Facility"));

  await page.goto(`${BASE}/opportunities?sort=closing`, { waitUntil: "domcontentloaded" });
  check("sort by closing soon puts the nearest deadline first",
    (await page.textContent("article")).includes("Silverline Student Founder Fellowship"));

  // Closed programmes ----------------------------------------------------
  await page.goto(`${BASE}/opportunities?q=quanta`, { waitUntil: "domcontentloaded" });
  check("closed programmes are hidden by default",
    !(await body()).includes("Quanta Semiconductor Design Award"));
  await page.goto(`${BASE}/opportunities?q=quanta&closed=1`, { waitUntil: "domcontentloaded" });
  check("closed programmes are still findable on request",
    (await body()).includes("Quanta Semiconductor Design Award"));

  // Detail page ----------------------------------------------------------
  await page.goto(`${BASE}/opportunities/anantara-deeptech-prototype-grant`, { waitUntil: "domcontentloaded" });
  const detail = await body();
  // An anonymous visitor sees the whole page structure and everything that is
  // always public. The deeper sections are covered by the phase 3 suite.
  check("detail page renders every section heading",
    ["What is it?", "What could you get?", "Who is it for?", "Who can apply?",
     "What does the programme offer?", "How to apply", "What should you prepare?",
     "Important dates", "Official programme page"].every((s) => detail.includes(s)));
  check("basic facts stay public with no details given",
    detail.includes("Anantara Innovation Foundation") &&
    detail.includes("Equity-free") && detail.includes("Prototype"));
  check("detail page shows trust information",
    detail.includes("Last verified") && detail.includes("Last checked"));
  check("detail page links to the official source",
    Boolean(await page.$('a[href="https://example.invalid/programmes/anantara-deeptech-prototype-grant"]')));
  check("the official source is never gated",
    detail.includes("Check the official programme page before applying"));
  check("unspecified fields say so rather than guessing", detail.includes("Not specified"));

  const shareHref = await page
    .getByRole("link", { name: "Share this opportunity" })
    .getAttribute("href");
  const sharedText = shareHref
    ? new URL(shareHref).searchParams.get("text")
    : null;
  const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute("href");
  check("Share continues to open WhatsApp",
    shareHref?.startsWith("https://wa.me/") ?? false, shareHref);
  check("WhatsApp share includes the exact opportunity URL",
    Boolean(canonicalHref && sharedText?.includes(canonicalHref)), sharedText);

  // Category pages -------------------------------------------------------
  await page.goto(`${BASE}/categories`, { waitUntil: "domcontentloaded" });
  const cats = await body();
  check("categories index groups all six dimensions",
    ["Opportunity Type", "Industry", "Startup Stage", "Founder Type", "Geography", "Provider Type"]
      .every((d) => cats.includes(d)));

  await page.goto(`${BASE}/categories/grants`, { waitUntil: "domcontentloaded" });
  const cat = await body();
  check("category page renders with a live count", /\d+\s*active opportunit/.test(cat));
  check("category page lists its subcategories", cat.includes("Prototype Grants"));
  check("category page shows related categories", cat.includes("Related categories"));

  await page.goto(`${BASE}/categories/kerala`, { waitUntil: "domcontentloaded" });
  check("every active category gets a page, including states",
    (await page.textContent("h1")).includes("Kerala"));

  // /grants alias --------------------------------------------------------
  await page.goto(`${BASE}/grants/kerala`, { waitUntil: "domcontentloaded" });
  check("/grants/<slug> redirects to the canonical category URL",
    page.url().endsWith("/categories/kerala"), page.url());

  // Not found ------------------------------------------------------------
  const res = await page.goto(`${BASE}/opportunities/no-such-programme`, { waitUntil: "domcontentloaded" });
  check("unknown opportunity returns 404", res.status() === 404, `status ${res.status()}`);

  // Works without JavaScript --------------------------------------------
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noJs.newPage();
  await plain.goto(`${BASE}/opportunities?c=grants`, { waitUntil: "domcontentloaded" });
  check("filtering works with JavaScript disabled",
    (await plain.textContent("body")).includes("Anantara DeepTech Prototype Grant"));
  await noJs.close();

  // Mobile ---------------------------------------------------------------
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const small = await mobile.newPage();
  await small.goto(BASE, { waitUntil: "domcontentloaded" });
  const overflow = await small.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("homepage does not scroll sideways on mobile", overflow <= 1, `${overflow}px overflow`);
  await small.goto(`${BASE}/opportunities`, { waitUntil: "domcontentloaded" });
  const overflow2 = await small.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("directory does not scroll sideways on mobile", overflow2 <= 1, `${overflow2}px overflow`);
  await mobile.close();
} catch (error) {
  fail.push(`threw: ${error.message.split("\n")[0]}`);
} finally {
  await browser.close();
}

console.log("\nPASS");
for (const p of pass) console.log("  ✓ " + p);
if (fail.length) {
  console.log("\nFAIL");
  for (const f of fail) console.log("  ✗ " + f);
}
console.log(`\n${pass.length} passed, ${fail.length} failed`);
process.exit(fail.length ? 1 : 0);
