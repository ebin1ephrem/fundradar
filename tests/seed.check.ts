/**
 * The seed-import acceptance rules from FUNDRADAR_SEED_IMPORT.md, run against
 * the real pipeline. Requires the dev fixtures to be loaded.
 */
import { readFileSync } from "fs";
import { prisma } from "@/lib/prisma";
import { ingestStructured } from "@/lib/ingestion";
import {
  parseSeedCsv,
  parseSeedJson,
  parseCsvRows,
  seedRecordText,
  seedToOutcome,
  type SeedRecord,
} from "@/lib/ingestion/seed";
import { publiclyVisible } from "@/lib/visibility";

const pass: string[] = [];
const fail: string[] = [];
const check = (name: string, ok: boolean, detail = "") =>
  (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ""}`);

const RUN = Date.now().toString(36).slice(-5);

async function importOne(record: SeedRecord, adminUserId: string) {
  return ingestStructured(
    {
      origin: "CSV_IMPORT",
      text: seedRecordText(record),
      url: `seed://fundradar/${encodeURIComponent(String(record.seed_id ?? record.title))}`,
      sourceUrl: record.source_url ?? null,
      sourceName: record.provider ?? null,
      pageTitle: record.title,
      adminUserId,
    },
    seedToOutcome(record),
  );
}

async function main() {
  const admin = await prisma.adminUser.findFirst();
  if (!admin) throw new Error("Run `npm run db:seed` first.");

  // === Parsing ==========================================================
  const json = parseSeedJson(
    '[{"seed_id":"a","title":"One"},{"seed_id":"b","title":"Two"}]',
  );
  check("JSON array parses", json.records.length === 2 && json.errors.length === 0);

  const wrapped = parseSeedJson('{"opportunities":[{"title":"Wrapped"}]}');
  check("JSON wrapped in an object parses", wrapped.records.length === 1);

  const badJson = parseSeedJson("{not json");
  check("invalid JSON reports an error", badJson.records.length === 0 && badJson.errors.length === 1);

  const noTitle = parseSeedJson('[{"seed_id":"x"}]');
  check(
    "a record without a title is rejected, not invented",
    noTitle.records.length === 0 && noTitle.errors[0].message.includes("title"),
  );

  const csvRows = parseCsvRows('a,b\n"one, with comma","said ""hi"""\n');
  check(
    "CSV quoting handled",
    csvRows[1][0] === "one, with comma" && csvRows[1][1] === 'said "hi"',
    JSON.stringify(csvRows[1]),
  );

  const csvMultiline = parseCsvRows('a\n"line one\nline two"\n');
  check("newlines inside quotes stay in the field", csvMultiline[1][0] === "line one\nline two");

  const csv = parseSeedCsv(
    "Seed ID,Title,Provider,funding_max_inr\n1,Alpha,Acme,500000\n2,Beta,Beta Corp,\n",
  );
  check("CSV header is normalised and rows parse", csv.records.length === 2, JSON.stringify(csv.errors));
  check("CSV maps seed_id from 'Seed ID'", csv.records[0].seed_id === "1", String(csv.records[0].seed_id));

  // === Mapping ==========================================================
  const outcome = seedToOutcome({
    seed_id: "map",
    title: "Mapping test",
    provider: "Provider Ltd",
    funding_max_inr: 500000,
    deadline: "15 October 2026",
    eligibility_summary: "UNKNOWN",
    benefits: "",
    suggested_categories: "Grants, ClimateTech",
  });

  const byName = new Map(outcome.fields.map((f) => [f.name, f.value]));
  check("title mapped", byName.get("title") === "Mapping test");
  check("funding maximum mapped", byName.get("fundingMax") === "500000");
  check('"UNKNOWN" is dropped, not stored', !byName.has("eligibilitySummary"));
  check("an empty value is dropped", !byName.has("benefitsSummary"));
  check(
    "unstated fields are listed as unknown",
    outcome.unknownFields.includes("eligibilitySummary") &&
      outcome.unknownFields.includes("applicationUrl"),
  );
  check(
    "evidence names the source column",
    outcome.fields.every((f) => f.evidence.startsWith("Seed import — column")),
  );
  check(
    "categories become suggestions",
    outcome.categorySuggestions.some((s) => s.slug === "grants") &&
      outcome.categorySuggestions.some((s) => s.slug === "climatetech"),
    outcome.categorySuggestions.map((s) => s.slug).join(", "),
  );

  // Programme corpus must never become a per-startup maximum.
  const corpus = seedToOutcome({
    seed_id: "corpus",
    title: "Tamil Nadu LangTech Startup Fund",
    program_corpus_inr: 25000000,
    funding_max_inr: null,
  });
  const corpusFields = new Map(corpus.fields.map((f) => [f.name, f.value]));
  check(
    "programme corpus does not become funding maximum",
    !corpusFields.has("fundingMax"),
    corpusFields.get("fundingMax") ?? "absent",
  );
  check(
    "programme corpus is recorded as funding notes",
    (corpusFields.get("fundingAmountText") ?? "").includes("Programme corpus"),
    corpusFields.get("fundingAmountText") ?? "none",
  );
  check(
    "the notes say the per-startup award is not stated",
    (corpusFields.get("fundingAmountText") ?? "").includes("not stated"),
  );

  // === End to end =======================================================
  const record: SeedRecord = {
    seed_id: `seed-${RUN}`,
    title: `Seed Import Test ${RUN}`,
    provider: `Seed Provider ${RUN}`,
    opportunity_type: "Grant",
    funding_max_inr: 1500000,
    deadline: "30 November 2026",
    eligibility_summary: "Prototype-stage startups registered in India.",
    application_url: `https://seed-${RUN}.example.org/apply`,
    source_url: `https://seed-${RUN}.example.org/`,
    suggested_categories: "Grants, DeepTech",
    admin_notes: "Imported from the initial seed set.",
  };

  const result = await importOne(record, admin.id);
  check("seed record becomes a draft", result.outcome === "DRAFT_CREATED", result.message);

  const draftId: string | null = result.opportunityId;

  if (draftId) {
    const draft = await prisma.opportunity.findUnique({ where: { id: draftId } });
    check("draft is PENDING_REVIEW", draft?.workflowStatus === "PENDING_REVIEW",
      draft?.workflowStatus ?? "missing");
    check("draft is inactive", draft?.isActive === false);
    check("ingestion method recorded as CSV_IMPORT", draft?.ingestionMethod === "CSV_IMPORT",
      draft?.ingestionMethod ?? "none");
    check("funding maximum imported", draft?.fundingMax?.toString() === "1500000",
      draft?.fundingMax?.toString() ?? "none");
    check("deadline imported", draft?.applicationDeadline?.toISOString().slice(0, 10) === "2026-11-30",
      draft?.applicationDeadline?.toISOString().slice(0, 10) ?? "none");
    check("eligibility imported", (draft?.eligibilitySummary ?? "").includes("Prototype-stage"));
    check("admin notes preserved", (draft?.importantNotes ?? "").includes("initial seed set"));
    check("source URL preserved", draft?.officialSourceUrl === record.source_url);

    // The publish gate is the only thing that makes anything public.
    const visible = await prisma.opportunity.count({
      where: { id: draftId, ...publiclyVisible },
    });
    check("the draft is not returned by a public query", visible === 0);

    const suggestions = await prisma.categorySuggestion.findMany({
      where: { opportunityId: draftId },
      include: { category: { select: { slug: true } } },
    });
    check("category suggestions created", suggestions.length > 0, `${suggestions.length}`);
    check(
      "every suggestion is SUGGESTED, none auto-approved",
      suggestions.every((s) => s.status === "SUGGESTED"),
    );

    const applied = await prisma.opportunityCategory.count({
      where: { opportunityId: draftId },
    });
    check("no category applied to the draft yet", applied === 0, `${applied}`);

    const review = await prisma.reviewItem.findFirst({ where: { opportunityId: draftId } });
    check("a review item is queued", Boolean(review), review?.type ?? "none");

    const run = await prisma.extractionRun.findFirst({
      where: { opportunityId: draftId },
      include: { fields: true },
    });
    check("the run is recorded as a seed import", run?.provider === "seed-import",
      run?.provider ?? "none");
    check("no model was called", run?.model === null);
    const unknown = run?.fields.filter((f) => f.isUnknown) ?? [];
    check("unknown fields recorded as unknown", unknown.length > 0, `${unknown.length}`);
    check(
      "a field the file omitted has no value",
      unknown.every((f) => f.value === null),
    );
  }

  // Re-importing the same seed_id must not create a second draft. The action
  // checks the collection item; assert the same lookup here.
  const again = await prisma.collectionItem.findFirst({
    where: { url: `seed://fundradar/seed-${RUN}`, origin: "CSV_IMPORT" },
    select: { opportunityId: true },
  });
  check("the seed id is re-findable for upsert", again?.opportunityId === draftId,
    again?.opportunityId ?? "not found");

  // === Shipped seed file ================================================
  const shipped = parseSeedJson(
    readFileSync("prisma/seed-data/fundradar_initial_opportunities.json", "utf8"),
  );
  check("the shipped seed file parses", shipped.records.length === 3, JSON.stringify(shipped.errors));

  const langtech = shipped.records.find((r) => r.seed_id === "tn-langtech-startup-fund");
  check("LangTech corpus recorded", Number(langtech?.program_corpus_inr) === 25000000);
  check("LangTech funding maximum left null", langtech?.funding_max_inr === null,
    String(langtech?.funding_max_inr));

  for (const r of shipped.records) {
    const o = seedToOutcome(r);
    const names = new Map(o.fields.map((f) => [f.name, f.value]));
    check(
      `"${r.title}" invents no deadline`,
      !names.has("applicationDeadline"),
      names.get("applicationDeadline") ?? "absent",
    );
    check(
      `"${r.title}" invents no funding amount`,
      !names.has("fundingMax") && !names.has("fundingMin"),
    );
    check(
      `"${r.title}" invents no provider`,
      !names.has("providerName"),
      names.get("providerName") ?? "absent",
    );
    check(`"${r.title}" carries category suggestions`, o.categorySuggestions.length > 0);
  }

  // === Clean up =========================================================
  const items = await prisma.collectionItem.findMany({
    where: { url: { contains: RUN } },
    select: { id: true, opportunityId: true },
  });
  const strays = items.map((i) => i.opportunityId).filter(Boolean) as string[];
  await prisma.opportunity.deleteMany({ where: { id: { in: strays } } });
  await prisma.collectionItem.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });
  check("the test cleans up after itself", strays.length >= 1, `${strays.length} drafts removed`);

  console.log("PASS");
  for (const p of pass) console.log("  ✓ " + p);
  if (fail.length) {
    console.log("\nFAIL");
    for (const f of fail) console.log("  ✗ " + f);
  }
  console.log(`\n${pass.length} passed, ${fail.length} failed`);
  process.exit(fail.length ? 1 : 0);
}

main();
