import { PrismaClient, type CategoryType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { CATEGORY_SEED, type SeedCategory } from "./seed-data/categories";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const HOMEPAGE_DEFAULTS = new Set([
  "grants",
  "seed-funds",
  "incubation-programs",
  "acceleration-programs",
]);

/** Fails loudly rather than silently overwriting a category with the same slug. */
function assertUniqueSlugs() {
  const seen = new Map<string, string>();
  const walk = (items: SeedCategory[], type: CategoryType) => {
    for (const item of items) {
      const slug = item.slug ?? slugify(item.name);
      const prior = seen.get(slug);
      if (prior) {
        throw new Error(
          `Seed slug collision on "${slug}": ${prior} vs ${type}/${item.name}. ` +
            `Give one of them an explicit slug in prisma/seed-data/categories.ts.`,
        );
      }
      seen.set(slug, `${type}/${item.name}`);
      if (item.children) walk(item.children, type);
    }
  };
  for (const group of CATEGORY_SEED) walk(group.items, group.categoryType);
  return seen.size;
}

async function seedCategories() {
  let created = 0;
  let existing = 0;

  const upsert = async (
    item: SeedCategory,
    type: CategoryType,
    parentId: string | null,
    order: number,
  ): Promise<string> => {
    const slug = item.slug ?? slugify(item.name);
    const found = await prisma.category.findUnique({ where: { slug } });
    if (found) {
      existing += 1;
      return found.id;
    }
    const row = await prisma.category.create({
      data: {
        name: item.name,
        slug,
        description: item.description ?? null,
        categoryType: type,
        parentId,
        icon: item.icon ?? null,
        displayOrder: order,
        featured: item.featured ?? false,
        showOnHomepage: item.showOnHomepage ?? HOMEPAGE_DEFAULTS.has(slug),
        active: true,
      },
    });
    created += 1;
    return row.id;
  };

  for (const group of CATEGORY_SEED) {
    let order = 0;
    for (const item of group.items) {
      order += 10;
      const parentId = await upsert(item, group.categoryType, null, order);
      let childOrder = 0;
      for (const child of item.children ?? []) {
        childOrder += 10;
        await upsert(child, group.categoryType, parentId, childOrder);
      }
    }
  }

  return { created, existing };
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@fundradar.local").toLowerCase();
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return { email, password: null };

  const password = process.env.ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");
  await prisma.adminUser.create({
    data: {
      email,
      name: process.env.ADMIN_NAME ?? "Super Admin",
      passwordHash: await bcrypt.hash(password, 11),
      role: "SUPER_ADMIN",
    },
  });
  return { email, password: process.env.ADMIN_PASSWORD ? null : password };
}

/**
 * Which detail sections a visitor must give their details to see. Editable at
 * Admin -> Settings; the public page reads this, never a hard-coded list.
 */
const DEFAULT_GATED_SECTIONS = [
  "fullDescription",
  "eligibility",
  "applicationProcess",
  "requiredDocuments",
  "benefits",
  "selectionProcess",
  "importantNotes",
  "applicationUrl",
  "relatedOpportunities",
];

async function seedSettings() {
  await prisma.setting.upsert({
    where: { key: "gatedSections" },
    update: {},
    create: { key: "gatedSections", value: DEFAULT_GATED_SECTIONS },
  });
  await prisma.setting.upsert({
    where: { key: "leadGate" },
    update: {},
    create: {
      key: "leadGate",
      value: {
        enabled: true,
        opportunityViewsBeforePrompt: 3,
        promptOnUnlockAction: true,
      },
    },
  });
}

async function main() {
  const slugCount = assertUniqueSlugs();
  console.log(`Seed taxonomy validated: ${slugCount} unique slugs.`);

  const cats = await seedCategories();
  console.log(`Categories: ${cats.created} created, ${cats.existing} already present.`);

  await seedSettings();
  console.log("Settings: defaults ensured.");

  const admin = await seedAdmin();
  if (admin.password) {
    console.log("\n  Admin account created");
    console.log(`  Email:    ${admin.email}`);
    console.log(`  Password: ${admin.password}`);
    console.log("  Save this now — it is not shown again.\n");
  } else {
    console.log(`Admin: ${admin.email} already exists (or password came from env).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
