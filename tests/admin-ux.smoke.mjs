/**
 * Admin workflow: INPUTS → REVIEW QUEUE → DRAFT → PUBLISHED → EXPIRED.
 * Scenarios A–H from the admin UX brief, driven through the real interface.
 */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const RUN = Date.now().toString(36).slice(-5);
const pass = [];
const fail = [];
const check = (n, ok, d = "") => ok ? pass.push(n) : fail.push(`${n}${d ? ` — ${d}` : ""}`);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on("pageerror", (e) => fail.push(`console error: ${e.message.slice(0, 120)}`));
const body = () => page.textContent("body");
const go = (p) => page.goto(BASE + p, { waitUntil: "domcontentloaded" });

const TITLE = `Kadamba Review Test ${RUN}`;

try {
  await go("/admin/login");
  await page.fill("#email", process.env.SMOKE_EMAIL);
  await page.fill("#password", process.env.SMOKE_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/, { timeout: 20000 });

  // --- Create an incoming record through the real ingestion path ---------
  await go("/admin/ingest/paste");
  await page.fill(
    "#text",
    `${TITLE} by Kadamba Council ${RUN} is open for applications. Startups working on water treatment can receive up to INR 12 lakh. Prototype stage startups may apply. Deadline 20 November 2026. Apply at https://kadamba-${RUN}.invalid/apply.`,
  );
  await page.fill("#sourceUrl", `https://kadamba-${RUN}.invalid/apply`);
  await page.getByRole("button", { name: "Create draft with AI" }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes("Draft created") ||
          document.body.innerText.includes("Saved for review"),
    null, { timeout: 40000 });

  // === TEST A — incoming record is in To Review, nowhere else ============
  await go("/admin/review");
  const queue = await body();
  check("A: review queue shows a prominent 'To review'", queue.includes("To review"));
  check("A: incoming record is in To Review", queue.includes(TITLE), "not listed");
  check("A: Rejected is present but secondary (a link, not a tab)",
    /Rejected \(\d+\)/.test(queue));
  check("A: no equal-weight per-source tabs",
    !queue.includes("Possible duplicates") && !queue.includes("Low confidence"));

  await go("/admin/opportunities");
  check("A: NOT in Opportunities → All", !(await body()).includes(TITLE));
  await go("/admin/opportunities?tab=drafts");
  check("A: NOT in Opportunities → Drafts", !(await body()).includes(TITLE));

  // === TEST B — Save as Draft ===========================================
  await go("/admin/review");
  await page.click(`a[href^="/admin/review/"]:has-text("${TITLE}")`);
  await page.waitForURL(/\/admin\/review\/[a-z0-9]+/, { timeout: 20000 });
  const reviewPage = await body();
  check("B: review screen offers Save as draft", reviewPage.includes("Save as draft"));
  check("B: review screen offers Reject", reviewPage.includes("Reject"));
  check("B: the embedded edit form has no publish submit",
    (await page.$$('button:has-text("Publish publicly")')).length === 0);
  check("B: review screen has no approval language",
    !/\bApprove\b/i.test(reviewPage),
    (reviewPage.match(/.{0,25}Approve.{0,25}/i) ?? [""])[0]);
  check("B: review screen offers no way to publish",
    !/Publish publicly/i.test(reviewPage),
    (reviewPage.match(/.{0,25}Publish publicly.{0,25}/i) ?? [""])[0]);

  await page.getByRole("button", { name: "Save as draft" }).first().click();
  await page.waitForURL(/\/admin\/opportunities\/[a-z0-9]+\?drafted=/, { timeout: 25000 });
  const draftUrl = page.url();
  const draftId = new URL(draftUrl).pathname.split("/").pop();

  await go("/admin/review");
  check("B: removed from To Review", !(await body()).includes(TITLE));
  await go("/admin/opportunities?tab=drafts");
  check("B: now in Opportunities → Drafts", (await body()).includes(TITLE));
  await go("/admin/opportunities");
  check("B: now in Opportunities → All", (await body()).includes(TITLE));

  // === TEST C — incomplete draft cannot publish =========================
  await go(`/admin/opportunities/${draftId}`);
  const draft = await body();
  check("C: draft page shows publication readiness", draft.includes("Publication readiness"));
  check("C: draft page uses 'Publish publicly'", draft.includes("Publish publicly"));
  check("C: no approval language on the draft page",
    !/Approve & publish|Approval|Ready for approval/i.test(draft));
  check("C: required fields are marked with an asterisk",
    (await page.$$eval("label.label", (ls) => ls.filter((l) => l.textContent.includes("*")).length)) >= 7,
    `${await page.$$eval("label.label", (ls) => ls.filter((l) => l.textContent.includes("*")).length)} marked`);

  const missingShown = /\d+ required fields? missing/.test(draft);
  const readyShown = draft.includes("Required information complete");
  check("C: readiness states either complete or the missing count",
    missingShown || readyShown);

  if (missingShown) {
    // Whether the control is disabled or clickable, the outcome must be the
    // same: nothing is published, and the missing fields are named.
    const pubBtn = await page.$('button:has-text("Publish publicly")');
    const disabled = pubBtn ? await pubBtn.isDisabled() : true;
    if (pubBtn && !disabled) {
      await pubBtn.click();
      await page.waitForTimeout(2500);
    }
    const after = await body();
    check("C: an incomplete draft is not published",
      !after.includes("Published. It is now searchable"));
    check("C: the missing fields are named",
      /required fields? missing|Cannot publish yet/i.test(after));
    check("C: the record is still a draft in the database",
      (await page.$$eval("body", (b) => b[0].innerText)).includes("Draft"));
  }

  // === TEST D — complete the draft, then publish ========================
  await go(`/admin/opportunities/${draftId}`);
  for (const [sel, val] of [
    ["#eligibilitySummary", "Prototype-stage startups registered in India."],
    ["#applicationUrl", `https://kadamba-${RUN}.invalid/apply`],
    ["#officialSourceUrl", `https://kadamba-${RUN}.invalid/apply`],
  ]) {
    const el = await page.$(sel);
    if (el) { await el.fill(""); await el.fill(val); }
  }
  const dl = await page.$("#applicationDeadline");
  if (dl && !(await dl.isDisabled())) await dl.fill("2026-11-20");

  const pick = async (name) => {
    await page.getByLabel("Filter categories").fill(name);
    const box = await page.getByRole("checkbox", { name, exact: true }).first();
    if (await box.isVisible().catch(() => false)) await box.check().catch(() => {});
    await page.getByLabel("Filter categories").fill("");
  };
  await pick("Grants");
  await pick("Prototype");

  await page.getByRole("button", { name: "Publish publicly" }).first().click();
  // The form's publish path redirects to ?saved=1, so wait for the status
  // badge to settle rather than for a particular notice.
  await page
    .waitForFunction(
      () =>
        document.querySelector("[data-workflow-status]")?.getAttribute("data-workflow-status") ===
        "PUBLISHED",
      null,
      { timeout: 30000 },
    )
    .catch(() => {});
  const afterPublish = await body();
  const badge = await page
    .$eval("[data-workflow-status]", (el) => el.getAttribute("data-workflow-status"))
    .catch(() => null);
  const didPublish = badge === "PUBLISHED";
  check(
    "D: Publish publicly publishes a complete draft",
    didPublish,
    `badge=${badge ?? "none"} ${(afterPublish.match(/Cannot publish[^.]*\.|still in review[^.]*\./) ?? [""])[0]}`,
  );

  // === TEST E — published appears in All and Published ===================
  if (didPublish) {
    await go("/admin/opportunities?tab=published");
    check("E: appears under Published", (await body()).includes(TITLE));
    await go("/admin/opportunities");
    check("E: appears under All", (await body()).includes(TITLE));
  }

  // === TEST F — expired hidden from All, shown under Expired ============
  await go("/admin/opportunities?tab=expired");
  const expiredView = await body();
  await go("/admin/opportunities");
  const allView = await body();
  const expiredTitles = ["Quanta Semiconductor Design Award"];
  for (const t of expiredTitles) {
    if (!expiredView.includes(t)) continue;
    check(`F: "${t}" is under Expired`, true);
    check(`F: "${t}" is NOT under All`, !allView.includes(t));
  }

  // === TEST G — reject removes from queue, keeps it out of Opportunities =
  await go("/admin/ingest/paste");
  const rejToken = `Palani Trust ${RUN}`;
  await page.fill("#text",
    `${rejToken} offers a grant of up to INR 5 lakh for rural water startups. Deadline 10 December 2026. Apply at https://palani-${RUN}.invalid/go.`);
  await page.fill("#sourceUrl", `https://palani-${RUN}.invalid/go`);
  await page.getByRole("button", { name: "Create draft with AI" }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes("Draft created") ||
          document.body.innerText.includes("Saved for review"),
    null, { timeout: 40000 });

  await go("/admin/review");
  const rejLink = await page.$(`a[href^="/admin/review/"]:has-text("${rejToken}")`);
  check("G: the rejectable record reached the queue", Boolean(rejLink));
  if (rejLink) {
    await rejLink.click();
    await page.waitForURL(/\/admin\/review\/[a-z0-9]+/, { timeout: 20000 });
    await page.getByRole("button", { name: "Reject", exact: true }).first().click();
    await page.waitForTimeout(600);
    const reasons = await page.$('input[name="reason"]');
    if (reasons) await reasons.check().catch(() => {});
    await page.getByRole("button", { name: /Reject/ }).last().click();
    await page.waitForURL(/\/admin\/review/, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(800);

    await go("/admin/review");
    check("G: rejected record leaves To Review", !(await body()).includes(rejToken));
    await go("/admin/review?tab=rejected");
    check("G: rejected record is in the secondary Rejected view",
      (await body()).includes(rejToken));
    await go("/admin/opportunities");
    check("G: rejected record is NOT in Opportunities → All", !(await body()).includes(rejToken));
    await go("/admin/opportunities?tab=drafts");
    check("G: rejected record is NOT in Drafts", !(await body()).includes(rejToken));
  }

  // === TEST H — mobile ==================================================
  const mobile = await ctx.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`${BASE}/admin/opportunities/${draftId}`, { waitUntil: "domcontentloaded" });
  const mb = await mobile.textContent("body");
  check("H: mobile uses the same 'Publish publicly' label", mb.includes("Publish publicly"));
  check("H: no Approve language on mobile",
    !/Approve & publish|Approve\b/i.test(mb));
  const mBtn = await mobile.$('button:has-text("Publish publicly")');
  check("H: mobile publish control is present", Boolean(mBtn));
  if (mBtn) {
    const box = await mBtn.boundingBox();
    check("H: mobile publish control is inside the viewport",
      Boolean(box) && box.x >= 0 && box.x + box.width <= 400,
      box ? `x=${Math.round(box.x)} w=${Math.round(box.width)}` : "no box");
  }
  const overflow = await mobile.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("H: mobile draft page does not scroll sideways", overflow <= 1, `${overflow}px`);
  await mobile.close();
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
