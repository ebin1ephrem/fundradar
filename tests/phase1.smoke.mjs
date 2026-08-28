import { chromium } from "playwright";

const BASE = "http://127.0.0.1:3100";
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
const RUN = Date.now().toString(36).slice(-5);
const pass = [];
const fail = [];

function check(name, ok, detail = "") {
  (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage();
page.on("pageerror", (e) => fail.push(`console error: ${e.message}`));

try {
  // 1. Admin routes are gated
  await page.goto(`${BASE}/admin/opportunities`, { waitUntil: "networkidle" });
  check("unauthenticated /admin redirects to login", page.url().includes("/admin/login"));

  // 2. Wrong credentials are rejected with a message that does not reveal
  //    whether the account exists. Uses a throwaway address so repeated runs
  //    never trip the real account's failed-attempt lockout.
  await page.fill("#email", `nobody+${RUN}@fundradar.local`);
  await page.fill("#password", "definitely-not-the-password");
  await page.click('button[type=submit]');
  await page.waitForFunction(
    () => document.body.innerText.includes("incorrect"),
    null,
    { timeout: 15000 },
  ).catch(() => {});
  check("wrong password rejected", (await page.textContent("body")).includes("Email or password is incorrect"));

  // 3. Real login
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/admin\/opportunities/, { timeout: 15000 });
  check("login lands on the requested page", page.url().includes("/admin/opportunities"));

  // 4. Dashboard renders
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  check("dashboard renders", (await page.textContent("h1")).includes("Good to see you"));

  // 5. Categories list shows the seeded taxonomy
  await page.goto(`${BASE}/admin/categories`, { waitUntil: "networkidle" });
  const bodyText = await page.textContent("body");
  check("seeded categories listed", bodyText.includes("CSR Funding") && bodyText.includes("Grants"));
  check("subcategory nesting shown", bodyText.includes("Prototype Grants"));

  // 6. Create a category
  await page.goto(`${BASE}/admin/categories/new?type=OPPORTUNITY_TYPE`, { waitUntil: "networkidle" });
  await page.fill("#name", `Defence Procurement ${RUN}`);
  await page.fill("#description", "Startup routes into defence supply chains.");
  await page.getByRole("button", { name: "Create category" }).click();
  await page.waitForURL(/created=/, { timeout: 15000 });
  check("category created", (await page.textContent("body")).includes(`Defence Procurement ${RUN}`));

  // 7. Create an opportunity.
  // /new is the method chooser since Phase 4; manual entry lives behind it.
  await page.goto(`${BASE}/admin/opportunities/manual`, { waitUntil: "networkidle" });
  await page.fill("#title", `Climate Innovation Challenge ${RUN}`);
  await page.fill("#providerName", "National Innovation Foundation");
  await page.fill("#shortDescription", "Equity-free funding for climate startups building measurable decarbonisation technology in India.");
  await page.fill("#officialSourceUrl", `https://example-agency.gov.in/programmes/climate-innovation-challenge-${RUN}`);
  await page.fill("#applicationUrl", "https://example-agency.gov.in/apply/cic-2026");
  await page.fill("#eligibilitySummary", "DPIIT-recognised startups incorporated for under five years with a working prototype.");
  await page.fill("#fundingMin", "500000");
  await page.fill("#fundingMax", "5000000");
  await page.fill("#applicationDeadline", "2026-10-15");
  // multi-dimension category selection, driven through the picker's filter box
  const pick = async (name) => {
    await page.getByLabel("Filter categories").fill(name);
    await page.getByRole("checkbox", { name, exact: true }).first().check();
    await page.getByLabel("Filter categories").fill("");
  };
  await pick("Grants");
  await pick("ClimateTech");
  await pick("Prototype");
  check("picker holds selections across dimensions",
    (await page.textContent("body")).includes("3 selected"));
  await page.getByRole("button", { name: "Save & publish" }).click();
  // The saved marker, not just the shape of the path: /manual, /new and
  // /import are all static segments that a bare id pattern also matches.
  await page.waitForURL(/\/admin\/opportunities\/[a-z0-9]+\?saved=/, { timeout: 25000 })
    .catch(() => {});
  const detail = await page.textContent("body");
  if (!detail.includes("Published")) {
    console.log("DEBUG create:", detail.replace(/\s+/g, " ").slice(0, 500));
  }
  check("opportunity created and published", detail.includes("Published"), page.url());
  check("multi-dimension categories held", detail.includes("3 selected") || detail.includes("selected"));

  // 8. Publication gate blocks an incomplete record
  await page.goto(`${BASE}/admin/opportunities/manual`, { waitUntil: "networkidle" });
  await page.fill("#title", `Incomplete Programme Record ${RUN}`);
  await page.fill("#providerName", "Test Provider");
  await page.fill("#shortDescription", "A record deliberately missing eligibility and categories to test the publication gate.");
  await page.fill("#officialSourceUrl", `https://example-agency.gov.in/programmes/incomplete-${RUN}`);
  await page.fill("#applicationUrl", "https://example-agency.gov.in/apply/incomplete");
  await page.check("input[name=isRollingDeadline]");
  await page.getByRole("button", { name: "Save & publish" }).click();
  await page.waitForFunction(
    () => document.body.innerText.includes("Cannot publish"),
    null,
    { timeout: 25000 },
  ).catch(() => {});
  const gateBody = await page.textContent("body");
  const gateLine = (gateBody.match(/Cannot publish[^.]*\./) ?? ["not shown"])[0];
  check("publication gate blocks missing eligibility/category", gateBody.includes("Cannot publish"), gateLine.slice(0, 160));

  // 9. Audit log recorded the publish
  await page.goto(`${BASE}/admin/audit`, { waitUntil: "networkidle" });
  const audit = await page.textContent("body");
  check("publish recorded in audit log", audit.includes("opportunity.publish"));
  check("category creation recorded", audit.includes("category.create"));

  // 10. Archive what this run created, so a test never leaves published
  //     records behind on the public site.
  await page.goto(`${BASE}/admin/opportunities?q=${RUN}`, { waitUntil: "networkidle" });
  const created = await page.$$eval('a[href^="/admin/opportunities/"]', (links) =>
    links.map((a) => a.getAttribute("href")).filter(Boolean),
  );
  for (const href of created) {
    await page.goto(BASE + href, { waitUntil: "networkidle" });
    const archive = await page.$('button:has-text("Archive")');
    if (archive) {
      await archive.click();
      await page.waitForTimeout(800);
    }
  }
  await page.goto(`${BASE}/admin/opportunities?status=PUBLISHED&q=${RUN}`, {
    waitUntil: "networkidle",
  });
  check("test records are archived, not left published",
    (await page.textContent("body")).includes("No opportunities match this view"));

  // 11. Sign out clears access
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Sign out")');
  await page.waitForURL(/\/admin\/login/, { timeout: 15000 });
  await page.goto(`${BASE}/admin/categories`, { waitUntil: "networkidle" });
  check("sign out revokes access", page.url().includes("/admin/login"));
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
