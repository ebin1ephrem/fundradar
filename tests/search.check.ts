/**
 * Search behaviour checks. Run against the dev fixtures:
 *   npm run db:fixtures && npm run check:search
 */
import { search } from "@/lib/search";
import { minimumMatch, parseQuery } from "@/lib/search/query";

const pass: string[] = [];
const fail: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const titles = (hits: { title: string }[]) => hits.map((h) => h.title);

async function main() {
  // --- Parsing -----------------------------------------------------------
  check("empty input parses to no query", parseQuery("") === null);
  check(
    "a phrase of only stopwords parses to no query",
    parseQuery("the for and of") === null,
  );
  check(
    "stopwords are dropped from the term list",
    parseQuery("grants for women in india")?.terms.join(",") ===
      "grants,women,india",
  );
  check("duplicate terms collapse", parseQuery("grant grant grant")?.terms.length === 1);
  check(
    "short queries need only one matching term",
    minimumMatch(1) === 1 && minimumMatch(2) === 1,
  );
  check(
    "longer queries need a majority of terms",
    minimumMatch(3) === 2 && minimumMatch(5) === 3 && minimumMatch(8) === 5,
  );

  // --- Matching ----------------------------------------------------------
  const all = await search.search({});
  check("the directory returns open opportunities", all.total > 0, `${all.total}`);

  const typo = await search.search({ q: "biotec" });
  check(
    "a typo still finds the record",
    titles(typo.hits).includes("Helix BioTech Commercialisation Grant"),
  );

  const multi = await search.search({ q: "women founder grants" });
  check(
    "multi-word queries keep recall and rank the best match first",
    multi.hits[0]?.title === "Meridian Women Founders Accelerator",
    titles(multi.hits).slice(0, 2).join(" | "),
  );

  const byCategory = await search.search({ q: "climate" });
  check(
    "a word that only appears as a tag still matches",
    titles(byCategory.hits).includes("Vidyut Clean Energy Challenge"),
  );

  // --- Precision ---------------------------------------------------------
  const broad = await search.search({
    q: "deeptech grant for climate startups in india",
  });
  check(
    "a long query does not return the whole directory",
    broad.total < all.total,
    `${broad.total} of ${all.total}`,
  );
  check(
    "a long query still ranks the intended record first",
    broad.hits[0]?.title === "Anantara DeepTech Prototype Grant",
    broad.hits[0]?.title ?? "none",
  );

  const junk = await search.search({ q: "xyzzy nonexistent gibberish" });
  check("nonsense matches nothing", junk.total === 0, `${junk.total}`);

  const stopwordsOnly = await search.search({ q: "the for and of" });
  check(
    "a stopword-only query falls back to the full directory",
    stopwordsOnly.total === all.total,
    `${stopwordsOnly.total} vs ${all.total}`,
  );

  // --- Filters -----------------------------------------------------------
  const grants = await search.search({ categorySlugs: ["grants"] });
  const grantChild = await search.search({ categorySlugs: ["prototype-grants"] });
  check(
    "a parent category rolls up its children",
    grants.total >= grantChild.total && grantChild.total > 0,
    `${grants.total} under Grants, ${grantChild.total} under Prototype Grants`,
  );

  // These assert the shape of the logic rather than a fixed count, so they hold
  // whatever data the database happens to contain.
  const deeptech = await search.search({ categorySlugs: ["deeptech"] });
  const climate = await search.search({ categorySlugs: ["climatetech"] });
  const sameDimension = await search.search({
    categorySlugs: ["deeptech", "climatetech"],
  });
  check(
    "categories from the same dimension are alternatives",
    sameDimension.total >= Math.max(deeptech.total, climate.total) &&
      sameDimension.total <= deeptech.total + climate.total,
    `${deeptech.total} | ${climate.total} -> ${sameDimension.total}`,
  );

  const crossDimension = await search.search({
    categorySlugs: ["grants", "climatetech"],
  });
  check(
    "categories from different dimensions narrow",
    crossDimension.total <= Math.min(grants.total, climate.total),
    `${grants.total} & ${climate.total} -> ${crossDimension.total}`,
  );

  const kerala = await search.search({ state: "Kerala" });
  check(
    "state filter works",
    kerala.total > 0 && kerala.hits.every((h) => h.state === "Kerala"),
    `${kerala.total}`,
  );

  const equityFree = await search.search({ equityFreeOnly: true });
  check("equity-free filter works", equityFree.total > 0, `${equityFree.total}`);

  const large = await search.search({ fundingAtLeast: 10_000_000 });
  check("funding floor works", large.total > 0 && large.total < all.total, `${large.total}`);

  const closing = await search.search({ closingWithinDays: 7 });
  check("deadline window works", closing.total > 0, `${closing.total}`);

  const registration = await search.search({ registrationRequired: true });
  check("registration filter works", registration.total > 0, `${registration.total}`);

  // --- Sorting -----------------------------------------------------------
  const largest = await search.search({ sort: "largest" });
  check(
    "largest funding sorts first",
    largest.hits[0]?.title === "Arclight Venture Debt Facility",
    largest.hits[0]?.title ?? "none",
  );

  const soonest = await search.search({ sort: "closing" });
  check(
    "nearest deadline sorts first",
    soonest.hits[0]?.title === "Silverline Student Founder Fellowship",
    soonest.hits[0]?.title ?? "none",
  );
  check(
    "rolling programmes do not jump the closing-soon queue",
    !soonest.hits.slice(0, 3).some((h) => h.isRollingDeadline),
  );

  // --- Lifecycle ---------------------------------------------------------
  const closedHidden = await search.search({ q: "quanta" });
  check("closed programmes are hidden by default", closedHidden.total === 0);
  const closedShown = await search.search({ q: "quanta", includeClosed: true });
  check("closed programmes stay findable on request", closedShown.total > 0);

  // --- Facets ------------------------------------------------------------
  const facets = await search.facets({}, ["grants", "seed-funds", "climatetech"]);
  check(
    "facet counts are returned per category",
    (facets.get("grants") ?? 0) > 0 && (facets.get("climatetech") ?? 0) > 0,
    JSON.stringify(Object.fromEntries(facets)),
  );

  // --- Pagination --------------------------------------------------------
  const allWithClosed = await search.search({ includeClosed: true, perPage: 1 });
  const paged = await search.search({ includeClosed: true, perPage: 5, page: 2 });
  check(
    "pagination reports a total independent of the page",
    paged.total === allWithClosed.total && paged.hits.length <= 5,
    `total ${paged.total}, ${paged.hits.length} rows on page 2`,
  );

  // --- Safety ------------------------------------------------------------
  const injection = await search.search({
    q: `'; DROP TABLE "Opportunity"; --`,
  });
  check("query text cannot alter the SQL", injection.total >= 0);
  const stillThere = await search.search({});
  check("the table survived the injection attempt", stillThere.total === all.total);

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
