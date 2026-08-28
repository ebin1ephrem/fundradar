/**
 * The acceptance tests from the Phase 4 spec, run directly against the
 * ingestion pipeline. Requires the dev fixtures to be loaded.
 */
import { prisma } from "@/lib/prisma";
import { ingest } from "@/lib/ingestion";
import { search } from "@/lib/search";
import { has } from "@/lib/env";

const pass: string[] = [];
const fail: string[] = [];
const check = (name: string, ok: boolean, detail = "") =>
  (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ""}`);

const RUN = Date.now().toString(36).slice(-5);

async function fieldsOf(opportunityId: string) {
  const run = await prisma.extractionRun.findFirst({
    where: { opportunityId },
    orderBy: { startedAt: "desc" },
    include: { fields: true },
  });
  return new Map(run?.fields.map((f) => [f.field, f]) ?? []);
}

async function categoriesOf(opportunityId: string) {
  const rows = await prisma.categorySuggestion.findMany({
    where: { opportunityId },
    include: { category: { select: { slug: true, name: true } } },
  });
  return rows.map((r) => r.category?.slug ?? `new:${r.suggestedName}`);
}

async function main() {
  const admin = await prisma.adminUser.findFirst();
  if (!admin) throw new Error("Run `npm run db:seed` first.");

  console.log(`Provider: ${has.ai() ? "Anthropic" : "heuristic fallback (no API key set)"}\n`);

  // === Acceptance test 43 — paste text ==================================
  const pasted = await ingest({
    origin: "PASTED_TEXT",
    adminUserId: admin.id,
    text: `ABC Foundation ${RUN} has opened applications for its 2026 climate startup program. Startups working on climate and clean energy can receive up to INR 25 lakh and three months of incubation. Prototype and MVP startups can apply. Deadline 15 October 2026. Apply at https://abc-${RUN}.org/climate.`,
  });

  check("pasted text produces a draft", pasted.outcome === "DRAFT_CREATED", pasted.message);

  if (pasted.opportunityId) {
    const draft = await prisma.opportunity.findUnique({ where: { id: pasted.opportunityId } });
    check("draft starts in PENDING_REVIEW", draft?.workflowStatus === "PENDING_REVIEW",
      draft?.workflowStatus ?? "missing");
    check("draft is not publicly visible", draft?.isActive === false);
    check("funding maximum read as 2500000",
      draft?.fundingMax?.toString() === "2500000", draft?.fundingMax?.toString() ?? "none");
    check("currency read as INR", draft?.currency === "INR", draft?.currency ?? "none");
    check("deadline read as 2026-10-15",
      draft?.applicationDeadline?.toISOString().slice(0, 10) === "2026-10-15",
      draft?.applicationDeadline?.toISOString().slice(0, 10) ?? "none");
    check("application URL captured",
      Boolean(draft?.applicationUrl?.includes(`abc-${RUN}.org/climate`)),
      draft?.applicationUrl ?? "none");
    check("ingestion method recorded", draft?.ingestionMethod === "PASTED_TEXT");

    const suggested = await categoriesOf(pasted.opportunityId);
    check("multiple categories suggested across dimensions", suggested.length >= 2,
      suggested.join(", "));
    check("a funding-type category was suggested",
      suggested.some((s) => ["grants", "incubation-programs", "csr-funding"].includes(s)),
      suggested.join(", "));

    const item = await prisma.collectionItem.findUnique({
      where: { id: pasted.collectionItemId },
    });
    check("the original pasted text is preserved",
      Boolean(item?.rawText?.includes("ABC Foundation")), `${item?.rawText?.length ?? 0} chars`);
    check("origin recorded as pasted text", item?.origin === "PASTED_TEXT");

    // Public search must not see it.
    const visible = await search.search({ q: `ABC Foundation ${RUN}`, includeClosed: true });
    check("a pending draft is invisible to public search", visible.total === 0,
      `${visible.total} results`);
  }

  // === Acceptance test 45 — no hallucination ============================
  const sparse = await ingest({
    origin: "PASTED_TEXT",
    adminUserId: admin.id,
    text: `Applications for XYZ Startup Program ${RUN} are now open. Apply soon.`,
  });

  if (sparse.opportunityId) {
    const draft = await prisma.opportunity.findUnique({ where: { id: sparse.opportunityId } });
    check("sparse text invents no funding amount",
      draft?.fundingMax === null && draft?.fundingMin === null,
      `${draft?.fundingMin ?? "null"} / ${draft?.fundingMax ?? "null"}`);
    check("sparse text invents no deadline", draft?.applicationDeadline === null,
      draft?.applicationDeadline?.toISOString() ?? "null");
    check("sparse text invents no eligibility", !draft?.eligibilitySummary,
      draft?.eligibilitySummary ?? "null");
    check("missing information is reported back", sparse.missingFields.length > 0,
      sparse.missingFields.map((f) => f.label).slice(0, 4).join(", "));
  } else {
    check("sparse text still reaches a human", sparse.outcome === "PARKED", sparse.message);
  }

  // === Dateless day/month must not gain a year =========================
  const dateless = await ingest({
    origin: "PASTED_TEXT",
    adminUserId: admin.id,
    text: `DEF foundation ${RUN} opened climate startup programme, upto 25L maybe prototype startups, last date Oct 15, they also give 3 months incubation. apply def-${RUN}.org/climate. Got this from Raj.`,
  });

  if (dateless.opportunityId) {
    const draft = await prisma.opportunity.findUnique({ where: { id: dateless.opportunityId } });
    check("a date with no year does not become a deadline",
      draft?.applicationDeadline === null,
      draft?.applicationDeadline?.toISOString() ?? "null");
    check("crude text still yields the funding amount",
      draft?.fundingMax?.toString() === "2500000", draft?.fundingMax?.toString() ?? "none");
    check("crude text still yields the application URL",
      Boolean(draft?.applicationUrl), draft?.applicationUrl ?? "none");

    const fields = await fieldsOf(dateless.opportunityId);
    check("extracted fields carry evidence",
      Boolean(fields.get("fundingMax")?.evidence), fields.get("fundingMax")?.evidence ?? "none");
    check("extracted fields carry confidence",
      typeof fields.get("fundingMax")?.confidence === "number");
    check("unconfirmed fields are recorded as unknown",
      [...fields.values()].some((f) => f.isUnknown));
  }

  // === Acceptance test 46 — duplicate ===================================
  const duplicate = await ingest({
    origin: "PASTED_TEXT",
    adminUserId: admin.id,
    text: `ABC Foundation ${RUN} has opened applications for its 2026 climate startup program. Startups working on climate and clean energy can receive up to INR 25 lakh and three months of incubation. Deadline 15 October 2026. Apply at https://abc-${RUN}.org/climate.`,
  });

  check("a repeat of the same announcement is flagged as a duplicate",
    duplicate.duplicates > 0, `${duplicate.duplicates} candidates`);

  if (duplicate.opportunityId) {
    const candidates = await prisma.duplicateCandidate.findMany({
      where: { opportunityId: duplicate.opportunityId },
      include: { existing: { select: { title: true } } },
    });
    check("the duplicate names the existing record", candidates.length > 0,
      candidates.map((c) => `${Math.round(c.score * 100)}% ${c.existing.title}`).join(" | "));
    const review = await prisma.reviewItem.findFirst({
      where: { opportunityId: duplicate.opportunityId },
    });
    check("a duplicate routes to the duplicates queue",
      review?.type === "POSSIBLE_DUPLICATE", review?.type ?? "none");
  }

  // === New cohort, not a duplicate =====================================
  const cohort = await ingest({
    origin: "PASTED_TEXT",
    adminUserId: admin.id,
    text: `ABC Foundation ${RUN} has opened applications for its 2027 climate startup program. Up to INR 30 lakh. Deadline 15 October 2027. Apply at https://abc-${RUN}.org/climate.`,
  });

  if (cohort.opportunityId) {
    const candidates = await prisma.duplicateCandidate.findMany({
      where: { opportunityId: cohort.opportunityId },
    });
    const flagged = candidates.some(
      (c) => (c.signals as { looksLikeNewCohort?: boolean } | null)?.looksLikeNewCohort,
    );
    check("a later year is surfaced as a possible new cohort", flagged,
      `${candidates.length} candidates`);
  }

  // === Acceptance test 48 — change detection ============================
  // Reset the fixture first: a previous run may have left it awaiting an
  // update, and the test would then silently skip.
  await prisma.reviewItem.deleteMany({
    where: { type: "UPDATE", opportunity: { slug: "anantara-deeptech-prototype-grant" } },
  });
  const published = await prisma.opportunity.update({
    where: { slug: "anantara-deeptech-prototype-grant" },
    data: { workflowStatus: "PUBLISHED" },
  });

  if (published) {
    const before = published.applicationDeadline?.toISOString().slice(0, 10);
    const update = await ingest({
      origin: "CRAWLER",
      adminUserId: admin.id,
      existingOpportunityId: published.id,
      url: published.officialSourceUrl,
      sourceUrl: published.officialSourceUrl,
      text: `${published.title}. ${published.shortDescription} The deadline has been extended: applications now close on 30 November 2026. Funding of up to INR 50 lakh is available.`,
    });

    check("a change on a published record proposes an update",
      update.outcome === "UPDATE_PROPOSED", update.message);

    const after = await prisma.opportunity.findUnique({ where: { id: published.id } });
    check("the public record keeps its approved deadline",
      after?.applicationDeadline?.toISOString().slice(0, 10) === before,
      `${before} -> ${after?.applicationDeadline?.toISOString().slice(0, 10)}`);
    check("the published page stays visible while an update waits",
      (await search.search({ q: "Anantara", includeClosed: true })).total > 0);

    const review = await prisma.reviewItem.findFirst({
      where: { opportunityId: published.id, type: "UPDATE" },
      orderBy: { createdAt: "desc" },
    });
    const changes = (review?.proposedChanges ?? []) as { field: string }[];
    check("the proposed change names the deadline",
      changes.some((c) => c.field === "applicationDeadline"),
      changes.map((c) => c.field).join(", "));
  }

  // === Unchanged content proposes nothing ==============================
  if (published) {
    const identical = `${published.title}. ${published.shortDescription} Applications close on 30 November 2026.`;
    await ingest({
      origin: "CRAWLER",
      adminUserId: admin.id,
      existingOpportunityId: published.id,
      url: published.officialSourceUrl,
      text: identical,
    });
    const again = await ingest({
      origin: "CRAWLER",
      adminUserId: admin.id,
      existingOpportunityId: published.id,
      url: published.officialSourceUrl,
      text: identical,
    });
    check("re-reading byte-identical material proposes nothing new",
      again.outcome === "UNCHANGED", again.outcome);
  }

  // === Not an opportunity ==============================================
  const article = await ingest({
    origin: "PASTED_TEXT",
    adminUserId: admin.id,
    text: "Our quarterly newsletter covers the team offsite, three new hires, and the office move to the second floor. Nothing else to report this month.",
  });
  check("material that is not an opportunity does not become a draft",
    article.opportunityId === null, article.outcome);
  check("it is kept for manual review rather than discarded",
    article.outcome === "PARKED", article.message);

  // Leave the database as we found it — a test must not add records to a
  // funding directory.
  const items = await prisma.collectionItem.findMany({
    where: { rawText: { contains: RUN } },
    select: { id: true, opportunityId: true },
  });
  const strays = items.map((i) => i.opportunityId).filter(Boolean) as string[];
  await prisma.opportunity.deleteMany({ where: { id: { in: strays } } });
  await prisma.collectionItem.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });
  await prisma.opportunity.update({
    where: { slug: "anantara-deeptech-prototype-grant" },
    data: { workflowStatus: "PUBLISHED" },
  });
  await prisma.reviewItem.deleteMany({
    where: { type: "UPDATE", opportunity: { slug: "anantara-deeptech-prototype-grant" } },
  });
  check("the test cleans up after itself", strays.length >= 4, `${strays.length} drafts removed`);

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
