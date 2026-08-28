import "server-only";
import { z } from "zod";
import type { ExtractionOutcome } from "@/lib/ai";
import { EXTRACTION_FIELDS, type ExtractionField } from "@/lib/ai/schema";
import { findDates } from "@/lib/ai/money";
import type { CollectionClassification } from "@prisma/client";

/**
 * The flat seed-file shape, mapped onto the canonical opportunity schema
 * rather than given a schema of its own.
 *
 * Every field except `title` is optional. A blank string, "UNKNOWN", "null"
 * or "N/A" all mean the same thing — the provider did not state it — and all
 * of them are dropped rather than filled in.
 */
const SeedRecordSchema = z
  .object({
    seed_id: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1, "title is required"),
    slug: z.string().optional(),
    provider: z.string().optional(),
    opportunity_type: z.string().optional(),
    funding_type: z.string().optional(),
    funding_min_inr: z.union([z.string(), z.number()]).nullish(),
    funding_max_inr: z.union([z.string(), z.number()]).nullish(),
    program_corpus_inr: z.union([z.string(), z.number()]).nullish(),
    deadline: z.string().nullish(),
    startup_stages: z.union([z.string(), z.array(z.string())]).nullish(),
    industries: z.union([z.string(), z.array(z.string())]).nullish(),
    technologies: z.union([z.string(), z.array(z.string())]).nullish(),
    eligibility_summary: z.string().nullish(),
    benefits: z.string().nullish(),
    description: z.string().nullish(),
    short_description: z.string().nullish(),
    application_url: z.string().nullish(),
    source_url: z.string().nullish(),
    geography: z.string().nullish(),
    state: z.string().nullish(),
    city: z.string().nullish(),
    country: z.string().nullish(),
    contact_email: z.string().nullish(),
    admin_notes: z.string().nullish(),
    suggested_categories: z.union([z.string(), z.array(z.string())]).nullish(),
    confidence: z.union([z.string(), z.number()]).nullish(),
  })
  .passthrough();

export type SeedRecord = z.infer<typeof SeedRecordSchema>;

/** Values that mean "the provider did not say", never "the answer is X". */
const UNKNOWN_MARKERS =
  /^(unknown|not specified|not specified by provider|n\/?a|none|null|nil|-|—)$/i;

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || UNKNOWN_MARKERS.test(text)) return null;
  return text;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => clean(v)).filter((v): v is string => Boolean(v));
  }
  const text = clean(value);
  if (!text) return [];
  return text
    .split(/[|;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type ParseResult = {
  records: SeedRecord[];
  errors: { row: number; message: string }[];
};

export function parseSeedJson(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return {
      records: [],
      errors: [
        {
          row: 0,
          message: `Not valid JSON: ${error instanceof Error ? error.message : "parse failed"}`,
        },
      ],
    };
  }

  // Accept a bare array, or an object wrapping one under a common key.
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { opportunities?: unknown })?.opportunities)
      ? (data as { opportunities: unknown[] }).opportunities
      : Array.isArray((data as { records?: unknown })?.records)
        ? (data as { records: unknown[] }).records
        : Array.isArray((data as { data?: unknown })?.data)
          ? (data as { data: unknown[] }).data
          : null;

  if (!rows) {
    return {
      records: [],
      errors: [
        {
          row: 0,
          message:
            "Expected an array of opportunities, or an object with an \"opportunities\", \"records\" or \"data\" array.",
        },
      ],
    };
  }

  return validateRows(rows);
}

/**
 * A small RFC 4180 reader: quoted fields, escaped quotes and newlines inside
 * quotes all work, because a real eligibility paragraph contains commas.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function parseSeedCsv(text: string): ParseResult {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return {
      records: [],
      errors: [{ row: 0, message: "The file needs a header row and at least one record." }],
    };
  }

  const header = rows[0].map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
  );

  const objects = rows.slice(1).map((cells) => {
    const object: Record<string, string> = {};
    header.forEach((key, i) => {
      if (key) object[key] = (cells[i] ?? "").trim();
    });
    return object;
  });

  return validateRows(objects);
}

function validateRows(rows: unknown[]): ParseResult {
  const records: SeedRecord[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, index) => {
    const parsed = SeedRecordSchema.safeParse(row);
    if (parsed.success) {
      records.push(parsed.data);
    } else {
      errors.push({
        row: index + 1,
        message: parsed.error.issues
          .map((i) => `${i.path.join(".") || "record"}: ${i.message}`)
          .join("; "),
      });
    }
  });

  return { records, errors };
}

// ---------------------------------------------------------------------------
// Mapping onto the canonical extraction shape
// ---------------------------------------------------------------------------

const FIELD_SET = new Set<string>(EXTRACTION_FIELDS);

/**
 * Turns one seed row into the same `ExtractionOutcome` the AI extractor
 * produces, so the record travels the existing ingestion pipeline unchanged.
 *
 * Confidence is 1 for every value present, because the value was given to us
 * rather than inferred — but the record still lands in PENDING_REVIEW, and the
 * evidence string says exactly which column it came from so a reviewer can see
 * that no model was involved.
 */
export function seedToOutcome(record: SeedRecord): ExtractionOutcome {
  const fields: ExtractionOutcome["fields"] = [];

  const push = (name: ExtractionField, value: unknown, column: string) => {
    const text = clean(value);
    if (!text) return;
    fields.push({
      name,
      value: text,
      confidence: 1,
      evidence: `Seed import — column "${column}"`,
    });
  };

  push("title", record.title, "title");
  push("providerName", record.provider, "provider");
  push("shortDescription", record.short_description, "short_description");
  push("fullDescription", record.description, "description");
  push("fundingMin", record.funding_min_inr, "funding_min_inr");
  push("fundingMax", record.funding_max_inr, "funding_max_inr");
  // The file may write the date any way it likes. findDates only returns a
  // date when the year is written down, so "closes 30 November" stays UNKNOWN
  // rather than being pinned to a guessed year.
  const deadline = clean(record.deadline);
  if (deadline) {
    const iso = findDates(deadline)[0]?.iso ?? null;
    if (iso) push("applicationDeadline", iso, "deadline");
  }
  push("eligibilitySummary", record.eligibility_summary, "eligibility_summary");
  push("benefitsSummary", record.benefits, "benefits");
  push("applicationUrl", record.application_url, "application_url");
  push("officialSourceUrl", record.source_url, "source_url");
  push("contactEmail", record.contact_email, "contact_email");
  push("state", record.state, "state");
  push("city", record.city, "city");
  push("country", record.country, "country");
  push("geographyScope", record.geography, "geography");

  const technologies = list(record.technologies);
  if (technologies.length) {
    push("technologies", technologies.join(", "), "technologies");
  }

  // A programme corpus is money the programme holds, not money a startup gets.
  // It is recorded as funding notes, never as fundingMax. (Seed instructions,
  // "Important Tamil Nadu LangTech rule".)
  const corpus = clean(record.program_corpus_inr);
  if (corpus) {
    const amount = Number(corpus.replace(/[^\d.]/g, ""));
    const readable = Number.isFinite(amount)
      ? `₹${amount.toLocaleString("en-IN")}`
      : corpus;
    push(
      "fundingAmountText",
      `Programme corpus: ${readable}. Per-startup award not stated by the provider.`,
      "program_corpus_inr",
    );
  }

  const notes = clean(record.admin_notes);
  if (notes) push("importantNotes", notes, "admin_notes");

  const named = new Set(fields.map((f) => f.name));
  const unknownFields = EXTRACTION_FIELDS.filter((f) => !named.has(f));

  // Categories come from several columns and are all suggestions — an admin
  // confirms each one. They are never auto-approved.
  const categoryNames = [
    ...list(record.suggested_categories),
    ...list(record.opportunity_type),
    ...list(record.funding_type),
    ...list(record.industries),
    ...list(record.startup_stages),
  ];

  const seen = new Set<string>();
  const categorySuggestions: ExtractionOutcome["categorySuggestions"] = [];
  const newCategorySuggestions: ExtractionOutcome["newCategorySuggestions"] = [];

  for (const name of categoryNames) {
    const slug = slugifyCategory(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    categorySuggestions.push({
      slug,
      confidence: 0.9,
      reason: `Named in the seed file as "${name}".`,
    });
    // If the slug is not in the taxonomy, saveSuggestions drops it — so the
    // name is also proposed, and an admin decides whether to create it.
    newCategorySuggestions.push({
      name,
      reason: "Named in the seed file; no matching category exists yet.",
    });
  }

  return {
    classification: {
      kind: classify(record),
      confidence: 1,
      reason: "Structured seed import — classification taken from the file.",
    },
    fields,
    unknownFields,
    categorySuggestions,
    newCategorySuggestions,
    provider: "seed-import",
    model: null,
    promptVersion: "seed-import-1",
  };
}

/**
 * The file states an opportunity type in words. We map the obvious ones and
 * fall back to POSSIBLE_FUNDING_OPPORTUNITY — never to a type the file did not
 * actually say.
 */
const CLASSIFICATION_HINTS: [RegExp, CollectionClassification][] = [
  [/accelerat/i, "ACCELERATION_PROGRAM"],
  [/incubat/i, "INCUBATION_PROGRAM"],
  [/fellow|entrepreneur.in.residence|\beir\b/i, "FELLOWSHIP"],
  [/csr/i, "CSR_FUNDING"],
  [/corporate innovation|open innovation/i, "CORPORATE_INNOVATION"],
  [/award|competition|challenge|hackathon|prize/i, "AWARD_OR_COMPETITION"],
  [/pilot|proof.of.concept|poc\b/i, "PILOT_OPPORTUNITY"],
  [/market access|export|soft landing/i, "MARKET_ACCESS"],
  [/procurement|supplier|tender/i, "PROCUREMENT_OPPORTUNITY"],
  [/seed fund|seed capital|pre.seed/i, "SEED_FUND"],
  [/grant|subsid/i, "GRANT"],
];

function classify(record: SeedRecord): CollectionClassification {
  const hay = [
    clean(record.opportunity_type),
    clean(record.funding_type),
    ...list(record.suggested_categories),
    clean(record.title),
  ]
    .filter(Boolean)
    .join(" ");

  for (const [pattern, kind] of CLASSIFICATION_HINTS) {
    if (pattern.test(hay)) return kind;
  }
  return "POSSIBLE_FUNDING_OPPORTUNITY";
}

/** The text kept as the collection item's original material. */
export function seedRecordText(record: SeedRecord): string {
  return Object.entries(record)
    .filter(([, value]) => clean(value) !== null || Array.isArray(value))
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join("\n");
}

export { clean as cleanSeedValue, list as listSeedValue, FIELD_SET };
