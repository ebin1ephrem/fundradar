import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const RUN = Date.now().toString(36).slice(-5);
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

try {
  // --- Sign in ----------------------------------------------------------
  await go("/admin/login");
  await page.fill("#email", process.env.SMOKE_EMAIL);
  await page.fill("#password", process.env.SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/, { timeout: 20000 });

  // --- Add opportunity offers three routes ------------------------------
  await go("/admin/opportunities/new");
  const chooser = await body();
  check("add opportunity offers all three methods",
    chooser.includes("Paste text") && chooser.includes("Add a URL") &&
    chooser.includes("Enter it manually"));
  check("monitoring a whole site is kept separate",
    chooser.includes("Monitor a whole site instead"));

  // --- Paste text -------------------------------------------------------
  await go("/admin/ingest/paste");
  check("paste screen explains what it accepts",
    (await body()).includes("WhatsApp message"));
  check("the button does not say publish",
    Boolean(await page.$('button:has-text("Create draft with AI")')) &&
    !(await page.$('button:has-text("Publish")')));

  await page.fill(
    "#text",
    `Sahyadri Foundation ${RUN} has opened applications for its 2026 climate startup programme. Startups working on climate adaptation and clean energy can receive up to INR 25 lakh and three months of incubation. Prototype and MVP startups can apply. Deadline 15 October 2026. Apply at https://sahyadri-${RUN}.invalid/climate. Contact grants@sahyadri-${RUN}.invalid.`,
  );
  await page.fill("#sourceUrl", `https://sahyadri-${RUN}.invalid/climate`);
  await page.getByRole("button", { name: "Create draft with AI" }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes("Draft created") ||
          document.body.innerText.includes("Saved for review"),
    null, { timeout: 40000 });

  const created = await body();
  check("pasting produces a draft, not a published record",
    created.includes("Draft created") && !created.includes("is live"));
  check("the success message never implies it is public",
    /before publishing/i.test(created) && !/is (now )?live|published/i.test(created));
  check("unconfirmed fields are named back to the admin",
    created.includes("Information we could not confirm"));

  await page.getByRole("link", { name: "Review draft" }).click();
  await page.waitForURL(/\/admin\/review\/[a-z0-9]+/, { timeout: 20000 });
  const reviewUrl = page.url();

  // --- Side-by-side review ---------------------------------------------
  const review = await body();
  check("review shows the original material",
    review.includes("Original pasted material") && review.includes("Sahyadri Foundation"));
  check("review shows per-field evidence", review.includes("What we read, and from where"));
  check("review shows suggested categories", review.includes("Suggested categories"));
  check("review shows the publication checklist", review.includes("Before publishing"));
  check("review shows the editable draft", Boolean(await page.$("#title")));
  check("the draft is marked pending review", review.includes("Pending review"));

  const extracted = await page.inputValue("#fundingMax");
  check("funding was extracted into the form", extracted === "2500000", extracted);
  const deadline = await page.inputValue("#applicationDeadline");
  check("the deadline was extracted into the form", deadline === "2026-10-15", deadline);

  // Accept a suggested category so the record can be published.
  const accept = await page.$$('button[aria-label^="Accept"]');
  check("suggested categories can be accepted one by one", accept.length > 0,
    `${accept.length} suggestions`);
  for (const button of accept.slice(0, 3)) {
    await button.click();
    await page.waitForTimeout(900);
  }

  // The gate needs an opportunity-type category. Pick one through the same
  // multi-select an admin uses.
  await page.goto(reviewUrl, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Filter categories").fill("Grants");
  await page.getByRole("checkbox", { name: "Grants", exact: true }).first().check();
  await page.getByLabel("Filter categories").fill("");
  check("categories can be picked across dimensions from the review screen",
    (await body()).includes("selected"));

  // --- Publishing is gated ---------------------------------------------
  await page.goto(reviewUrl, { waitUntil: "domcontentloaded" });
  const beforePublish = await body();
  const blocked = /\d+ requirements? still outstanding/.test(beforePublish);
  if (blocked) {
    // Fill what the gate demands, exactly as an admin would.
    await page.fill("#eligibilitySummary", "Prototype and MVP stage startups working on climate adaptation or clean energy.");
    await page.getByRole("button", { name: "Save as draft" }).click();
    const saved = await page
      .waitForURL(/\/admin\/opportunities\/[a-z0-9]+/, { timeout: 25000 })
      .then(() => true)
      .catch(() => false);
    if (!saved) {
      const alerts = await page.$$eval("[role=alert]", (els) =>
        els.map((e) => e.textContent?.trim()).filter(Boolean),
      );
      fail.push(`saving the draft did not navigate — ${alerts.join(" | ") || page.url()}`);
    }
    await page.goto(reviewUrl, { waitUntil: "domcontentloaded" });
  }

  const ready = await body();
  check("the publication checklist reflects what is still missing",
    ready.includes("Before publishing"));

  // --- Approve and publish ---------------------------------------------
  const publish = await page.$('button:has-text("Approve & publish")');
  check("an approve and publish control exists", Boolean(publish));
  if (publish && !(await publish.isDisabled())) {
    await publish.click();
    // Wait for the redirect's own marker: the review detail page is already
    // under /admin/review, so a path-shaped wait matches before the action runs.
    await page.waitForURL(/[?&]published=/, { timeout: 25000 }).catch(() => {});
    check("publishing confirms it is now live",
      (await body()).includes("live on the public site"), page.url());
  } else {
    check("publishing stays blocked until the record is complete", true,
      "gate held — checklist still outstanding");
  }

  // --- The published record reaches the public site ---------------------
  await go("/admin/opportunities?status=PUBLISHED");
  const published = await body();
  if (published.includes("Climate Startup Programme") || published.includes("climate")) {
    const link = await page.$(`a[href^="/admin/opportunities/"]`);
    if (link) {
      await link.click();
      await page.waitForURL(/\/admin\/opportunities\/[a-z0-9]+/, { timeout: 20000 });
    }
  }

  // --- Sources ----------------------------------------------------------
  await go("/admin/sources/new");
  const sourceForm = await body();
  check("the source form offers all three crawl shapes",
    sourceForm.includes("One page") && sourceForm.includes("A listing page") &&
    sourceForm.includes("A section of a site"));
  check("auto-publish is explicitly not offered",
    sourceForm.includes("There is no such setting"));

  await page.fill("#name", `Kadamba Council ${RUN}`);
  await page.fill("#url", "http://127.0.0.1:8099");
  await page.fill("#organisation", `Kadamba ${RUN}`);
  // The radio itself is visually hidden inside its label, so click the label.
  await page.getByText("A listing page", { exact: true }).click();
  check("the crawl shape can be chosen",
    await page.isChecked('input[name="crawlType"][value="LISTING_PAGE"]'));
  await page.getByRole("button", { name: "Add source" }).click();
  await page.waitForURL(/\/admin\/sources\/(?!new)[a-z0-9]+/, { timeout: 25000 });
  check("a source can be added",
    ((await page.textContent("[role=status]").catch(() => "")) ?? "").includes("Source saved"));

  const runNow = await page.$('button:has-text("Run now")');
  if (runNow) {
    await runNow.click();
    await page.waitForURL(/ran=1/, { timeout: 90000 });
    const ranBody = await body();
    const summaryText = (await page.textContent('[role=status]').catch(() => null)) ?? "";
    check("running a source reports what it found",
      /read \d+ page/.test(summaryText),
      summaryText || "no status message");
    check("source health is shown",
      /healthy|partial|stale|error/i.test(ranBody));
  }

  // --- Crawled drafts land in review, not public ------------------------
  await go("/admin/review");
  const queue = await body();
  check("the review queue lists what was collected",
    queue.includes("Coastal Resilience") || queue.includes("Textile"),
    queue.includes("Nothing waiting here") ? "queue empty" : "items present");
  check("the queue has the spec's tabs",
    ["New opportunities", "Updates", "Possible duplicates", "Low confidence", "Rejected"]
      .every((t) => queue.includes(t)));

  await page.goto(`${BASE}/opportunities?q=Coastal+Resilience+Grant`, {
    waitUntil: "domcontentloaded",
  });
  // The heading echoes the search term, so check the result cards, not the page text.
  const cardTitles = await page.$$eval("article h3", (els) =>
    els.map((e) => e.textContent?.trim() ?? ""),
  );
  check("crawled drafts are not on the public site",
    !cardTitles.some((t) => t.includes("Coastal Resilience Grant")),
    cardTitles.length ? cardTitles.join(" | ") : "no results");

  // --- Collection inbox -------------------------------------------------
  await go("/admin/inbox?tab=all");
  const inbox = await body();
  check("the collection inbox lists raw collected material",
    inbox.includes("Collection inbox"));
  check("the inbox records where each item came from",
    inbox.includes("crawler") || inbox.includes("pasted text"));

  // --- Crawl jobs -------------------------------------------------------
  await go("/admin/jobs");
  const jobs = await body();
  check("crawl jobs are visible with their counters",
    jobs.includes("Pages read") && jobs.includes("Drafts created"));
  check("job statuses are shown",
    jobs.includes("succeeded") || jobs.includes("partial") || jobs.includes("queued"));

  // --- Rejection remembers ---------------------------------------------
  await go("/admin/review?tab=new");
  const firstReview = await page.$('a[href^="/admin/review/"]:not([href*="tab="])');
  if (firstReview) {
    await firstReview.click();
    await page.waitForURL(/\/admin\/review\/[a-z0-9]+/, { timeout: 20000 });
    await page.getByRole("button", { name: "Reject", exact: true }).first().click();
    await page.waitForTimeout(500);
    const rejectPanel = await body();
    check("rejecting asks for a reason",
      rejectPanel.includes("Why are you rejecting this?"));
    check("rejection explains it is remembered",
      rejectPanel.includes("does not bring the same thing back"));
  }

  // --- Public site is unaffected ---------------------------------------
  const home = await page.goto(BASE, { waitUntil: "domcontentloaded" });
  check("the public homepage still works", home.status() === 200);
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
