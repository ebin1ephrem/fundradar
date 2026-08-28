import { search } from "@/lib/search";

const show = (label: string, r: { total: number; hits: { title: string }[] }) =>
  console.log(`${label}\n  total=${r.total}  ${r.hits.slice(0, 4).map((h) => h.title).join(" | ")}`);

async function main() {
  show("all open", await search.search({}));
  show("q=biotec (typo)", await search.search({ q: "biotec" }));
  show("q=women founder grants", await search.search({ q: "women founder grants" }));
  show("q=climate", await search.search({ q: "climate" }));
  show("category: grants (rolls up children)", await search.search({ categorySlugs: ["grants"] }));
  show("grants AND climatetech (cross-dimension AND)", await search.search({ categorySlugs: ["grants", "climatetech"] }));
  show("deeptech OR climatetech (same dimension OR)", await search.search({ categorySlugs: ["deeptech", "climatetech"] }));
  show("state=Kerala", await search.search({ state: "Kerala" }));
  show("equity-free only", await search.search({ equityFreeOnly: true }));
  show("funding >= 10,000,000", await search.search({ fundingAtLeast: 10000000 }));
  show("closing within 7 days", await search.search({ closingWithinDays: 7 }));
  show("registration required (DPIIT/Udyam)", await search.search({ registrationRequired: true }));
  show("sort=largest", await search.search({ sort: "largest" }));
  show("sort=closing", await search.search({ sort: "closing" }));
  show("include closed", await search.search({ includeClosed: true }));

  const facets = await search.facets({}, ["grants", "seed-funds", "incubation-programs", "acceleration-programs", "csr-funding"]);
  console.log("facet counts (parents roll up children):", Object.fromEntries(facets));

  const page2 = await search.search({ includeClosed: true, perPage: 5, page: 2 });
  console.log(`pagination: page 2 of ${page2.pages}, ${page2.hits.length} rows, total ${page2.total}`);

  const injection = await search.search({ q: "'; DROP TABLE \"Opportunity\"; --" });
  console.log(`injection attempt handled: total=${injection.total}`);
}

main().then(() => process.exit(0));
