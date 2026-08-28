/**
 * DEVELOPMENT FIXTURES — NOT REAL FUNDING PROGRAMMES.
 *
 * Sample opportunities so the directory, search, filters and category pages can
 * be exercised locally. Every provider below is invented. Never run this
 * against a production database: the platform's whole value is that published
 * records are real and sourced, and these are neither.
 *
 *   npx tsx prisma/dev-fixtures.ts
 */
import { PrismaClient, type FundingType, type GeographyScope } from "@prisma/client";

const prisma = new PrismaClient();

const NOTICE =
  "Sample record for local development. This is not a real funding programme.";

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

type Fixture = {
  slug: string;
  title: string;
  providerName: string;
  shortDescription: string;
  fundingMin?: number;
  fundingMax?: number;
  currency?: string;
  fundingTypes: FundingType[];
  isEquityFree?: boolean;
  deadlineInDays?: number | null;
  isRollingDeadline?: boolean;
  geographyScope?: GeographyScope;
  country?: string;
  state?: string;
  requiresDpiit?: boolean;
  requiresWomenFounder?: boolean;
  providerSector?: "GOVERNMENT" | "PRIVATE" | "ACADEMIC" | "NONPROFIT" | "MULTILATERAL";
  categories: string[];
  primary: string;
};

const FIXTURES: Fixture[] = [
  {
    slug: "anantara-deeptech-prototype-grant",
    title: "Anantara DeepTech Prototype Grant",
    providerName: "Anantara Innovation Foundation",
    shortDescription:
      "Equity-free grant for deeptech teams turning a validated lab result into a working prototype, with lab access at partner institutions.",
    fundingMin: 1500000,
    fundingMax: 5000000,
    fundingTypes: ["GRANT", "EQUITY_FREE", "RND_FUNDING"],
    isEquityFree: true,
    deadlineInDays: 5,
    requiresDpiit: true,
    providerSector: "NONPROFIT",
    categories: ["grants", "prototype-grants", "deeptech", "prototype", "researchers"],
    primary: "grants",
  },
  {
    slug: "vidyut-clean-energy-challenge",
    title: "Vidyut Clean Energy Challenge",
    providerName: "Vidyut Energy Mission",
    shortDescription:
      "Open challenge for startups cutting grid emissions, with a paid pilot on a live distribution network for every shortlisted team.",
    fundingMin: 2500000,
    fundingMax: 10000000,
    fundingTypes: ["CHALLENGE", "GRANT", "PRIZE"],
    isEquityFree: true,
    deadlineInDays: 22,
    providerSector: "GOVERNMENT",
    categories: [
      "innovation-challenges",
      "government-challenges",
      "climatetech",
      "energy",
      "pilot-opportunities",
      "mvp",
    ],
    primary: "innovation-challenges",
  },
  {
    slug: "kaveri-state-seed-fund",
    title: "Kaveri State Seed Fund",
    providerName: "Kaveri State Startup Cell",
    shortDescription:
      "State-backed seed capital for registered startups with early revenue, disbursed in two tranches against agreed milestones.",
    fundingMin: 2000000,
    fundingMax: 7500000,
    fundingTypes: ["INVESTMENT", "EQUITY_FUNDING"],
    deadlineInDays: 40,
    geographyScope: "STATE",
    state: "Karnataka",
    requiresDpiit: true,
    providerSector: "GOVERNMENT",
    categories: ["seed-funds", "government-seed-funds", "early-revenue", "saas"],
    primary: "seed-funds",
  },
  {
    slug: "meridian-women-founders-accelerator",
    title: "Meridian Women Founders Accelerator",
    providerName: "Meridian Growth Collective",
    shortDescription:
      "Twelve-week accelerator for women-led startups, combining a cash stipend with investor introductions and a demo day.",
    fundingMin: 1000000,
    fundingMax: 2500000,
    fundingTypes: ["ACCELERATOR", "STIPEND"],
    deadlineInDays: 12,
    requiresWomenFounder: true,
    providerSector: "PRIVATE",
    categories: [
      "acceleration-programs",
      "startup-accelerator",
      "women-founders",
      "seed-stage",
      "fintech",
    ],
    primary: "acceleration-programs",
  },
  {
    slug: "sahyadri-agritech-incubation",
    title: "Sahyadri AgriTech Incubation Programme",
    providerName: "Sahyadri Agricultural University",
    shortDescription:
      "Nine-month incubation for agritech startups working on post-harvest losses, with greenhouse and testing facilities on campus.",
    fundingMin: 500000,
    fundingMax: 2500000,
    fundingTypes: ["INCUBATOR", "GRANT"],
    isEquityFree: true,
    deadlineInDays: 68,
    geographyScope: "STATE",
    state: "Maharashtra",
    providerSector: "ACADEMIC",
    categories: [
      "incubation-programs",
      "university-incubation",
      "agritech",
      "agriculture",
      "prototype",
    ],
    primary: "incubation-programs",
  },
  {
    slug: "orbit-corporate-csr-impact-fund",
    title: "Orbit Corporate CSR Impact Fund",
    providerName: "Orbit Industries CSR Trust",
    shortDescription:
      "CSR-funded grants for startups improving livelihoods in tier-two and tier-three cities, with no equity taken.",
    fundingMin: 1000000,
    fundingMax: 4000000,
    fundingTypes: ["GRANT", "EQUITY_FREE"],
    isEquityFree: true,
    isRollingDeadline: true,
    deadlineInDays: null,
    providerSector: "PRIVATE",
    categories: [
      "csr-funding",
      "csr-grants",
      "social-impact",
      "rural-innovation",
      "early-revenue",
    ],
    primary: "csr-funding",
  },
  {
    slug: "helix-biotech-commercialisation-grant",
    title: "Helix BioTech Commercialisation Grant",
    providerName: "Helix Life Sciences Council",
    shortDescription:
      "Late-stage grant for biotech teams moving a validated assay or device towards regulatory approval and first sales.",
    fundingMin: 5000000,
    fundingMax: 25000000,
    fundingTypes: ["GRANT", "RND_FUNDING", "EQUITY_FREE"],
    isEquityFree: true,
    deadlineInDays: 95,
    requiresDpiit: true,
    providerSector: "GOVERNMENT",
    categories: [
      "grants",
      "commercialisation-grants",
      "biotech",
      "healthtech",
      "early-revenue",
    ],
    primary: "grants",
  },
  {
    slug: "northgate-global-soft-landing",
    title: "Northgate Global Soft Landing Programme",
    providerName: "Northgate International Trade Board",
    shortDescription:
      "Market-entry support for startups expanding into Northern Europe, covering travel, workspace and buyer introductions.",
    fundingMin: 800000,
    fundingMax: 3000000,
    fundingTypes: ["GRANT", "SUBSIDY"],
    deadlineInDays: 31,
    geographyScope: "INTERNATIONAL",
    country: "International",
    providerSector: "MULTILATERAL",
    categories: [
      "international-programs",
      "market-access-programs",
      "soft-landing-programs",
      "growth",
      "manufacturing",
    ],
    primary: "international-programs",
  },
  {
    slug: "silverline-student-founder-fellowship",
    title: "Silverline Student Founder Fellowship",
    providerName: "Silverline Education Trust",
    shortDescription:
      "A one-year fellowship paying a monthly stipend to student founders so they can work on their venture full time.",
    fundingMin: 600000,
    fundingMax: 600000,
    fundingTypes: ["FELLOWSHIP", "STIPEND", "EQUITY_FREE"],
    isEquityFree: true,
    deadlineInDays: 3,
    providerSector: "NONPROFIT",
    categories: [
      "fellowships",
      "founder-fellowship",
      "student-founders",
      "idea-stage",
      "edtech",
    ],
    primary: "fellowships",
  },
  {
    slug: "tarang-manufacturing-capital-subsidy",
    title: "Tarang Manufacturing Capital Subsidy",
    providerName: "Tarang Industrial Development Authority",
    shortDescription:
      "Reimburses part of the capital cost of new plant and machinery for small manufacturers setting up in notified districts.",
    fundingMax: 15000000,
    fundingTypes: ["SUBSIDY"],
    isRollingDeadline: true,
    deadlineInDays: null,
    geographyScope: "STATE",
    state: "Gujarat",
    providerSector: "GOVERNMENT",
    categories: [
      "subsidies",
      "capital-subsidy",
      "manufacturing",
      "industry-4-0",
      "growth",
    ],
    primary: "subsidies",
  },
  {
    slug: "quanta-semiconductor-design-award",
    title: "Quanta Semiconductor Design Award",
    providerName: "Quanta Electronics Association",
    shortDescription:
      "Cash-prize competition for chip design teams, with fabrication credits and mentoring for the top three entries.",
    fundingMin: 500000,
    fundingMax: 3000000,
    fundingTypes: ["COMPETITION", "PRIZE"],
    deadlineInDays: -14,
    providerSector: "PRIVATE",
    categories: [
      "awards-and-competitions",
      "cash-prize-competitions",
      "semiconductor",
      "electronics",
      "prototype",
    ],
    primary: "awards-and-competitions",
  },
  {
    slug: "coastal-blue-economy-pilot",
    title: "Coastal Blue Economy Pilot Programme",
    providerName: "Coastal Development Mission",
    shortDescription:
      "Paid pilots for startups working on sustainable fisheries, port logistics and coastal water quality monitoring.",
    fundingMin: 1200000,
    fundingMax: 6000000,
    fundingTypes: ["GRANT", "CHALLENGE"],
    deadlineInDays: 6,
    geographyScope: "STATE",
    state: "Kerala",
    providerSector: "GOVERNMENT",
    categories: [
      "pilot-opportunities",
      "paid-pilot",
      "blue-economy",
      "sustainability",
      "mvp",
    ],
    primary: "pilot-opportunities",
  },
  {
    slug: "arclight-venture-debt-facility",
    title: "Arclight Venture Debt Facility",
    providerName: "Arclight Capital Partners",
    shortDescription:
      "Non-dilutive debt for revenue-generating startups that have raised an institutional round in the last eighteen months.",
    fundingMin: 10000000,
    fundingMax: 100000000,
    fundingTypes: ["DEBT", "LOAN"],
    isRollingDeadline: true,
    deadlineInDays: null,
    providerSector: "PRIVATE",
    categories: ["debt-and-loans", "venture-debt", "scale-up", "saas"],
    primary: "debt-and-loans",
  },
  {
    slug: "novus-open-innovation-call",
    title: "Novus Open Innovation Call",
    providerName: "Novus Manufacturing Group",
    shortDescription:
      "Corporate open innovation call seeking robotics and computer vision startups for factory-floor deployments.",
    fundingMin: 2000000,
    fundingMax: 8000000,
    fundingTypes: ["CHALLENGE", "INVESTMENT"],
    deadlineInDays: 47,
    providerSector: "PRIVATE",
    categories: [
      "corporate-innovation",
      "open-innovation",
      "robotics",
      "automation",
      "manufacturing",
      "early-revenue",
    ],
    primary: "corporate-innovation",
  },
];

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.FORCE_DEV_FIXTURES) {
    throw new Error(
      "Refusing to load sample opportunities into a production database.",
    );
  }

  const admin = await prisma.adminUser.findFirst({ orderBy: { createdAt: "asc" } });
  if (!admin) throw new Error("Run `npm run db:seed` first — no admin exists.");

  let created = 0;
  let skipped = 0;

  for (const fixture of FIXTURES) {
    const exists = await prisma.opportunity.findUnique({
      where: { slug: fixture.slug },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    const categories = await prisma.category.findMany({
      where: { slug: { in: fixture.categories } },
      select: { id: true, slug: true },
    });
    const missing = fixture.categories.filter(
      (slug) => !categories.some((c) => c.slug === slug),
    );
    if (missing.length) {
      console.warn(`  ${fixture.slug}: unknown category slugs ${missing.join(", ")}`);
    }

    const now = new Date();
    const deadline =
      fixture.deadlineInDays === null || fixture.deadlineInDays === undefined
        ? null
        : daysFromNow(fixture.deadlineInDays);
    const sourceUrl = `https://example.invalid/programmes/${fixture.slug}`;

    const opportunity = await prisma.opportunity.create({
      data: {
        slug: fixture.slug,
        title: fixture.title,
        providerName: fixture.providerName,
        shortDescription: fixture.shortDescription,
        fullDescription: `${NOTICE}\n\n${fixture.shortDescription}`,
        fundingMin: fixture.fundingMin ?? null,
        fundingMax: fixture.fundingMax ?? null,
        currency: fixture.currency ?? "INR",
        fundingTypes: fixture.fundingTypes,
        isEquityFree: fixture.isEquityFree ?? null,
        applicationDeadline: deadline,
        isRollingDeadline: fixture.isRollingDeadline ?? false,
        eligibilitySummary:
          "Open to incorporated startups that meet the provider's stated criteria. See the official source for the full eligibility list.",
        benefitsSummary:
          "Funding, structured mentoring and access to the provider's partner network.",
        applicationProcess:
          "Apply through the official portal. Shortlisted teams are invited to present to a review panel.",
        requiredDocuments:
          "Incorporation certificate, pitch deck, founder identity documents.",
        selectionProcess: "Eligibility screening, panel review, final selection.",
        geographyScope: fixture.geographyScope ?? "PAN_INDIA",
        country: fixture.country ?? "India",
        state: fixture.state ?? null,
        requiresDpiit: fixture.requiresDpiit ?? null,
        requiresWomenFounder: fixture.requiresWomenFounder ?? null,
        providerSector: fixture.providerSector ?? null,
        applicationUrl: `${sourceUrl}/apply`,
        officialSourceUrl: sourceUrl,
        originalSourceUrl: sourceUrl,
        sourceWebsite: "example.invalid",
        offersMentoring: true,
        offersNetworking: true,
        workflowStatus: "PUBLISHED",
        verificationStatus: "ADMIN_VERIFIED",
        isActive: true,
        createdById: admin.id,
        approvedById: admin.id,
        approvedAt: now,
        publishedById: admin.id,
        publishedAt: now,
        extractionDate: now,
        lastCheckedAt: now,
        lastVerifiedAt: now,
        categories: {
          create: categories.map((category) => ({
            categoryId: category.id,
            isPrimary: category.slug === fixture.primary,
          })),
        },
      },
    });

    await prisma.opportunityVersion.create({
      data: {
        opportunityId: opportunity.id,
        versionNumber: 1,
        snapshot: { note: NOTICE },
        changedFields: ["workflowStatus"],
        changeSummary: "Published (development fixture)",
        sourceUrl,
        createdById: admin.id,
        approvedById: admin.id,
        approvedAt: now,
      },
    });

    created += 1;
  }

  console.log(`Fixtures: ${created} created, ${skipped} already present.`);
  console.log("These are invented programmes for local development only.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
