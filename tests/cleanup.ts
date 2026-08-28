/**
 * Removes records the browser smoke tests create.
 *
 * Those tests drive the real admin UI, so an interrupted run leaves drafts —
 * and sometimes a published record — behind, which then skews the search
 * relevance checks.
 *
 * The rule has to separate test output from the dev fixtures, which also live
 * on `.invalid`. Fixtures are all under the single host `example.invalid`;
 * smoke-test records carry a per-run token in the hostname, come from the
 * local crawler fixture server, or use a `seed://` key. Anything matching
 * `example.invalid` is therefore left alone.
 */
import { prisma } from "@/lib/prisma";

/** Hosts the dev fixtures own. Never removed. */
const FIXTURE_HOST = "example.invalid";

const TEST_SOURCE = [
  { officialSourceUrl: { contains: ".invalid" } },
  { originalSourceUrl: { contains: ".invalid" } },
  { officialSourceUrl: { contains: "127.0.0.1:8099" } },
  { originalSourceUrl: { contains: "127.0.0.1:8099" } },
  { originalSourceUrl: { startsWith: "seed://" } },
] as const;

async function main() {
  const opportunities = await prisma.opportunity.findMany({
    where: {
      OR: [...TEST_SOURCE],
      NOT: [
        { officialSourceUrl: { contains: FIXTURE_HOST } },
        { originalSourceUrl: { contains: FIXTURE_HOST } },
      ],
    },
    select: { id: true, title: true, workflowStatus: true },
  });

  const items = await prisma.collectionItem.findMany({
    where: {
      OR: [
        { url: { contains: ".invalid" } },
        { url: { contains: "127.0.0.1:8099" } },
        { url: { startsWith: "seed://" } },
      ],
      NOT: { url: { contains: FIXTURE_HOST } },
    },
    select: { id: true, opportunityId: true },
  });

  const ids = new Set([
    ...opportunities.map((o) => o.id),
    ...items.map((i) => i.opportunityId).filter((id): id is string => Boolean(id)),
  ]);

  const reportCount = await prisma.errorReport.count({
    where: { message: { contains: "The apply link 404s." } },
  });

  if (ids.size === 0 && items.length === 0 && reportCount === 0) {
    console.log("Nothing to clean up.");
    process.exit(0);
  }

  for (const o of opportunities) {
    console.log(`  removing ${o.workflowStatus} "${o.title}"`);
  }

  await prisma.collectionItem.deleteMany({ where: { id: { in: items.map((i) => i.id) } } });
  await prisma.opportunity.deleteMany({ where: { id: { in: [...ids] } } });
  await prisma.rejectedItem.deleteMany({
    where: {
      OR: [
        { url: { contains: ".invalid" } },
        { url: { contains: "127.0.0.1:8099" } },
      ],
      NOT: { url: { contains: FIXTURE_HOST } },
    },
  });
  await prisma.source.deleteMany({ where: { websiteUrl: { contains: "127.0.0.1:8099" } } });
  // Reports the Phase 6 smoke test files against a fixture listing.
  const reports = await prisma.errorReport.deleteMany({
    where: { message: { contains: "The apply link 404s." } },
  });
  if (reports.count) console.log(`  removing ${reports.count} test error reports`);

  console.log(`Removed ${ids.size} opportunities and ${items.length} collection items.`);
  process.exit(0);
}

main();
