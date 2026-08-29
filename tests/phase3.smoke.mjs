import { chromium } from "playwright";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const RUN = Date.now().toString(36).slice(-6);
const EMAIL = `founder+${RUN}@example.test`;
const pass = [];
const fail = [];
const check = (name, ok, detail = "") =>
  (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ""}`);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", (e) => fail.push(`console error: ${e.message.slice(0, 120)}`));
const body = () => page.textContent("body");
const go = (path) => page.goto(BASE + path, { waitUntil: "domcontentloaded" });

try {
  // --- Browsing is free -------------------------------------------------
  await go("/opportunities");
  await page.waitForTimeout(600);
  check("directory is browsable with no popup",
    !(await page.evaluate(() => Boolean(document.querySelector("dialog[open]")))));

  await go("/opportunities/anantara-deeptech-prototype-grant");
  await page.waitForTimeout(800);
  const gated = await body();
  check("public basics are visible before identifying",
    gated.includes("Anantara Innovation Foundation") &&
    gated.includes("Funding") && gated.includes("Deadline"));
  check("deep sections are locked", gated.includes("Read the full programme description"));
  check("eligibility is locked", gated.includes("See the full eligibility criteria"));
  check("no popup on a first opportunity view",
    !(await page.evaluate(() => Boolean(document.querySelector("dialog[open]")))));
  check("the official application link is withheld until identified",
    !(await page.$('a:has-text("Go to official call")')));

  // --- Clicking a locked action opens the popup -------------------------
  await page.getByRole("button", { name: "Check if it fits" }).first().click();
  await page.waitForSelector("dialog[open]", { timeout: 10000 });
  const modal = await page.textContent("dialog");
  check("clicking a locked section opens the capture popup", modal.length > 0);
  check("popup leads with the reward, not with signing up",
    /Want to know if this one is worth pursuing\?/.test(modal) &&
    !/sign up|create an account|register/i.test(modal));
  check("popup asks only for the four fields",
    (await page.$$("dialog input:not([type=hidden])")).length === 4);
  check("popup explains why it wants a WhatsApp number",
    modal.includes("Get deadline alerts and urgent funding updates."));
  check("popup states what submitting consents to",
    modal.includes("relevant startup funding opportunities and deadline alerts"));

  // Close it — a visitor who is not ready keeps browsing.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check("the popup can be dismissed",
    !(await page.evaluate(() => Boolean(document.querySelector("dialog[open]")))));

  // --- Auto-prompt after browsing several -------------------------------
  await go("/opportunities/vidyut-clean-energy-challenge");
  await page.waitForTimeout(700);
  await go("/opportunities/helix-biotech-commercialisation-grant");
  await page.waitForTimeout(2600);
  check("popup appears after browsing several opportunities",
    await page.evaluate(() => Boolean(document.querySelector("dialog[open]"))));

  // --- Capture ----------------------------------------------------------
  await page.fill("#lead-name", "Priya Nair");
  await page.fill("#lead-email", EMAIL);
  await page.fill("#lead-whatsapp", "+91 98765 43210");
  await page.fill("#lead-startup", `Acme Robotics ${RUN}`);
  // The gate button on the page and the modal's submit share a label, so scope
  // the click to the dialog — the page button is behind a modal and inert.
  await page.locator('dialog button[type="submit"]').first().click();
  await page.waitForFunction(
    () => document.body.innerText.includes("You're on the radar") ||
          document.body.innerText.includes("You’re in"),
    null, { timeout: 20000 });
  check("submitting gives an immediate reward, not a bare thank you",
    (await body()).includes("Now, here's the information you were looking for."));

  // Wait for the in-place refresh rather than guessing at a duration.
  const unlockedInPlace = await page
    .waitForFunction(
      () =>
        !document.body.innerText.includes("See the full eligibility criteria") &&
        document.body.innerText.includes("Eligibility"),
      null,
      { timeout: 20000 },
    )
    .then(() => true)
    .catch(() => false);
  check("the section they wanted unlocks in place, on the same page",
    unlockedInPlace && page.url().includes("helix-biotech"), page.url());
  check("the official application link appears once identified",
    Boolean(await page.$('a:has-text("Go to official call")')));

  // --- Remembered -------------------------------------------------------
  await go("/opportunities/kaveri-state-seed-fund");
  await page.waitForTimeout(1200);
  const second = await body();
  check("a second opportunity opens fully, with no second popup",
    !second.includes("Read the full programme description") &&
    !(await page.evaluate(() => Boolean(document.querySelector("dialog[open]")))));

  // --- Saving -----------------------------------------------------------
  await page.getByRole("button", { name: /Put .* on your Radar/ }).first().click();
  await page.waitForTimeout(1500);
  await go("/dashboard/saved");
  check("saved opportunities reach the dashboard",
    (await body()).includes("Kaveri State Seed Fund"));

  await page.getByRole("button", { name: "Applied" }).first().click();
  await page.waitForTimeout(1200);
  await go("/dashboard/saved?status=APPLIED");
  check("saved status can be changed",
    (await body()).includes("Kaveri State Seed Fund"));

  // --- Dashboard --------------------------------------------------------
  await go("/dashboard");
  const dash = await body();
  check("dashboard shows recommendations", dash.includes("Worth a Look"));
  check("recommendations explain what they are based on",
    /Based on your interest in|Newest first while we learn/.test(dash));
  check("dashboard shows the categories it learned", dash.includes("Your categories"));

  // --- Progressive profiling -------------------------------------------
  await go("/dashboard/profile");
  const before = Number((await body()).match(/(\d+)%/)?.[1] ?? 0);
  await page.selectOption("#industryCategoryId", { label: "Robotics" });
  await page.selectOption("#stageCategoryId", { label: "Prototype" });
  await page.fill("#city", "Kochi");
  await page.fill("#state", "Kerala");
  await page.fill("#website", "https://acme-robotics.example");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.waitForTimeout(2200);
  await go("/dashboard/profile");
  const after = Number((await body()).match(/(\d+)%/)?.[1] ?? 0);
  check("profile completion rises as details are added", after > before, `${before}% → ${after}%`);

  // --- Alerts and consent ----------------------------------------------
  await go("/dashboard/alerts");
  const alerts = await body();
  check("alert preferences are editable", alerts.includes("The Weekly Radar"));
  check("email and WhatsApp consent are separate controls",
    alerts.includes("Email me funding opportunities") &&
    alerts.includes("Message me on WhatsApp"));

  await page.uncheck('input[name="emailConsent"]');
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.waitForTimeout(1800);
  check("consent can be withdrawn", (await body()).includes("Preferences saved"));

  // --- Sign out and magic link -----------------------------------------
  await go("/dashboard/profile");
  await page.getByRole("button", { name: "Sign out on this device" }).click();
  await page.waitForTimeout(1500);
  await go("/dashboard");
  check("signing out returns to the sign-in prompt",
    (await body()).includes("Sign in with your email"));

  await page.fill("#signin-email", EMAIL);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.waitForTimeout(2000);
  check("magic link request confirms without revealing whether the account exists",
    (await body()).includes("Check your inbox"));

  await go("/signin");
  await page.fill("#signin-email", `nobody-${RUN}@example.test`);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.waitForTimeout(2000);
  check("an unknown address gets the identical response",
    (await body()).includes("Check your inbox"));

  // --- Anonymous visitor still sees the gate ---------------------------
  const stranger = await browser.newContext();
  const strangerPage = await stranger.newPage();
  await strangerPage.goto(`${BASE}/opportunities/kaveri-state-seed-fund`, {
    waitUntil: "domcontentloaded",
  });
  await strangerPage.waitForTimeout(700);
  check("a different visitor still sees the gate",
    (await strangerPage.textContent("body")).includes("Read the full programme description"));
  await stranger.close();
  // --- Admin side -------------------------------------------------------
  if (process.env.SMOKE_EMAIL && process.env.SMOKE_PASSWORD) {
    const adminCtx = await browser.newContext();
    const admin = await adminCtx.newPage();
    await admin.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
    await admin.fill("#email", process.env.SMOKE_EMAIL);
    await admin.fill("#password", process.env.SMOKE_PASSWORD);
    await admin.getByRole("button", { name: "Sign in" }).click();
    await admin.waitForURL(/\/admin$/, { timeout: 20000 });

    await admin.goto(`${BASE}/admin/leads`, { waitUntil: "domcontentloaded" });
    const list = await admin.textContent("body");
    check("admin sees the captured lead", list.includes(EMAIL));
    check("admin sees consent state per channel", list.includes("Email") && list.includes("WA"));

    await admin.getByRole("link", { name: new RegExp(`Acme Robotics ${RUN}`) }).click();
    await admin.waitForURL(/\/admin\/leads\/[a-z0-9]+/, { timeout: 20000 });
    const detail = await admin.textContent("body");
    check("lead detail shows the activity timeline", detail.includes("Activity timeline"));
    check("timeline records what they viewed and unlocked",
      detail.includes("Viewed an opportunity") && detail.includes("Gave their details"));
    check("lead detail shows learned interests", detail.includes("Interested in"));
    check("lead detail shows consent provenance", detail.includes("Consent"));
    check("lead detail shows the score breakdown", /Score \d+\//.test(detail));

    // Fetched from inside the page so the browser's own cookie jar is used.
    // Playwright's API client drops Secure cookies over plain http.
    const download = await admin.evaluate(async () => {
      const response = await fetch("/admin/leads/export");
      return {
        status: response.status,
        disposition: response.headers.get("content-disposition"),
        type: response.headers.get("content-type"),
        text: await response.text(),
      };
    });
    check("CSV export returns a downloadable file",
      download.disposition?.includes("attachment") &&
      download.type?.includes("text/csv"),
      `${download.status} ${download.type}`);
    check("CSV contains the documented columns",
      download.text.includes('"Founder Name"') &&
      download.text.includes('"Email Consent"') &&
      download.text.includes('"Categories Interested In"'));
    check("CSV contains the captured lead", download.text.includes(EMAIL));
    check("CSV quotes every field so a comma in a name cannot break a row",
      download.text.split("\r\n")[0].split(",").every((cell) => cell.startsWith('"')));

    await adminCtx.close();

    const anonExport = await page.evaluate(async () => {
      const response = await fetch("/admin/leads/export");
      return { type: response.headers.get("content-type"), text: await response.text() };
    });
    check("lead export refuses an unauthenticated request",
      !anonExport.type?.includes("csv") && !anonExport.text.includes(EMAIL),
      anonExport.type ?? "no type");
  }
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
