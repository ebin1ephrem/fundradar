import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { opportunityLd } from "../src/components/public/structured-data";
import {
  toCachedSearchHit,
  type SearchDatabaseRow,
} from "../src/lib/search/cache-values";

const row: SearchDatabaseRow = {
  id: "opp-1",
  slug: "cache-safe-opportunity",
  title: "Cache-safe opportunity",
  providerName: "FundRadar Test",
  providerLogoUrl: null,
  shortDescription: "A public cache regression fixture.",
  fundingMin: new Prisma.Decimal("100000"),
  fundingMax: new Prisma.Decimal("1000000"),
  currency: "INR",
  fundingAmountText: null,
  isEquityFree: true,
  fundingTypes: ["GRANT"],
  applicationDeadline: new Date("2026-12-31T00:00:00.000Z"),
  isRollingDeadline: false,
  applicationOpenDate: new Date("2026-09-01T00:00:00.000Z"),
  lifecycleOverride: null,
  geographyScope: "PAN_INDIA",
  country: "India",
  state: null,
  publishedAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  viewCount: BigInt(42),
  search_rank: 1.5,
  total_count: BigInt(123),
};

const hit = toCachedSearchHit(row, []);
assert.doesNotThrow(() => JSON.stringify(hit));
assert.equal(hit.viewCount, 42);
assert.equal(hit.updatedAt, "2026-09-01T00:00:00.000Z");
assert.equal("total_count" in hit, false);
assert.equal("search_rank" in hit, false);

const structured = opportunityLd("https://www.fundradar.in", {
  slug: hit.slug,
  title: hit.title,
  shortDescription: hit.shortDescription,
  providerName: hit.providerName,
  officialSourceUrl: "https://example.com/opportunity",
  applicationUrl: null,
  applicationDeadline: hit.applicationDeadline,
  applicationOpenDate: hit.applicationOpenDate,
  fundingMin: hit.fundingMin,
  fundingMax: hit.fundingMax,
  currency: hit.currency,
  updatedAt: hit.updatedAt,
});

assert.equal(structured.dateModified, "2026-09-01T00:00:00.000Z");
assert.equal(structured.expires, "2026-12-31T00:00:00.000Z");
assert.equal(structured.startDate, "2026-09-01T00:00:00.000Z");
assert.doesNotThrow(() => JSON.stringify(structured));

console.log("Public cache serialization checks passed.");
