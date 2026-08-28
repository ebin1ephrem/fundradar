"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { ingestStructured } from "@/lib/ingestion";
import {
  parseSeedCsv,
  parseSeedJson,
  seedRecordText,
  seedToOutcome,
  type SeedRecord,
} from "@/lib/ingestion/seed";

export type ImportRow = {
  seedId: string | null;
  title: string;
  outcome: "CREATED" | "MATCHED" | "SKIPPED" | "FAILED";
  message: string;
  opportunityId: string | null;
  duplicates: number;
  missing: number;
};

export type ImportState = {
  error?: string;
  parseErrors?: { row: number; message: string }[];
  summary?: {
    total: number;
    created: number;
    matched: number;
    skipped: number;
    failed: number;
  };
  rows?: ImportRow[];
};

/**
 * Admin → Opportunities → Import Seed Data.
 *
 * Every record goes through the same pipeline as pasted text and crawled
 * pages: SEED IMPORT → DRAFT → PENDING_REVIEW → ADMIN REVIEW → APPROVE &
 * PUBLISH. Nothing here writes a published record, nothing auto-approves a
 * category, and a value the file does not contain stays UNKNOWN.
 */
export async function importSeedAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const admin = await requireAdmin();

  const file = formData.get("file");
  const pasted = String(formData.get("text") ?? "").trim();

  let text = pasted;
  let filename = "pasted";

  if (file instanceof File && file.size > 0) {
    if (file.size > 5_000_000) {
      return { error: "That file is larger than 5 MB. Split it and import in parts." };
    }
    text = await file.text();
    filename = file.name;
  }

  if (!text) {
    return { error: "Choose a JSON or CSV file, or paste the records below." };
  }

  const looksJson = text.trimStart().startsWith("[") || text.trimStart().startsWith("{");
  const format = /\.csv$/i.test(filename) ? "csv" : looksJson ? "json" : "csv";

  const { records, errors } = format === "json" ? parseSeedJson(text) : parseSeedCsv(text);

  if (records.length === 0) {
    return {
      error: "No usable records found in that file.",
      parseErrors: errors.slice(0, 20),
    };
  }

  const rows: ImportRow[] = [];

  for (const record of records) {
    try {
      rows.push(await importOne(record, admin.id));
    } catch (error) {
      rows.push({
        seedId: seedKey(record),
        title: record.title,
        outcome: "FAILED",
        message: error instanceof Error ? error.message : "Import failed.",
        opportunityId: null,
        duplicates: 0,
        missing: 0,
      });
    }
  }

  const summary = {
    total: rows.length,
    created: rows.filter((r) => r.outcome === "CREATED").length,
    matched: rows.filter((r) => r.outcome === "MATCHED").length,
    skipped: rows.filter((r) => r.outcome === "SKIPPED").length,
    failed: rows.filter((r) => r.outcome === "FAILED").length,
  };

  await audit({
    adminUserId: admin.id,
    action: "seed.imported",
    entityType: "Opportunity",
    summary: `Seed import from ${filename}: ${summary.created} drafts created, ${summary.matched} matched an existing record, ${summary.failed} failed`,
    after: summary,
  });

  revalidatePath("/admin/review");
  revalidatePath("/admin/opportunities");

  return { summary, rows, parseErrors: errors.slice(0, 20) };
}

function seedKey(record: SeedRecord): string | null {
  const value = record.seed_id;
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

/** The stable identity of a seed record inside the collection log. */
function seedUrl(record: SeedRecord): string {
  const key = seedKey(record) ?? record.slug ?? record.title;
  return `seed://fundradar/${encodeURIComponent(String(key))}`;
}

async function importOne(
  record: SeedRecord,
  adminUserId: string,
): Promise<ImportRow> {
  const key = seedKey(record);
  const url = seedUrl(record);

  // Upsert by seed_id: re-running the same file must not create a second
  // draft. An existing record is left exactly as it is — including anything
  // an admin already edited or published.
  const previous = await prisma.collectionItem.findFirst({
    where: { url, origin: "CSV_IMPORT" },
    orderBy: { discoveredAt: "desc" },
    select: { id: true, opportunityId: true },
  });

  if (previous?.opportunityId) {
    return {
      seedId: key,
      title: record.title,
      outcome: "MATCHED",
      message: "Already imported from this seed id — left untouched.",
      opportunityId: previous.opportunityId,
      duplicates: 0,
      missing: 0,
    };
  }

  const result = await ingestStructured(
    {
      origin: "CSV_IMPORT",
      text: seedRecordText(record),
      url,
      sourceUrl: record.source_url ?? null,
      sourceName: record.provider ?? null,
      pageTitle: record.title,
      adminUserId,
    },
    seedToOutcome(record),
  );

  return {
    seedId: key,
    title: record.title,
    outcome: result.opportunityId ? "CREATED" : "SKIPPED",
    message: result.message,
    opportunityId: result.opportunityId,
    duplicates: result.duplicates,
    missing: result.missingFields.length,
  };
}
