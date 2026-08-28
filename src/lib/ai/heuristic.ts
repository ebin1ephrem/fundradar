import { findDates, findMoney, hasDatelessDayMonth } from "./money";
import { PROMPT_VERSION } from "./prompt";
import type { ExtractionInput, ExtractionOutcome, ExtractionProvider } from "./types";
import type { ExtractionField } from "./schema";
import { IMPORTANT_FIELDS } from "./schema";

type Field = { name: ExtractionField; value: string; confidence: number; evidence: string };

/**
 * A rule-based extractor used when no AI key is configured, and as the safety
 * net when a model call fails.
 *
 * It only reports what it can point at in the text. Where the AI provider might
 * reason its way to a value, this one stays silent — which is the correct
 * failure mode for a directory whose whole value is that its facts are real.
 * Everything it produces still goes to a human for review.
 */
export class HeuristicExtractionProvider implements ExtractionProvider {
  readonly name = "heuristic";
  readonly model = null;

  async extract(input: ExtractionInput): Promise<ExtractionOutcome> {
    const text = input.text;
    const plain = text.replace(/\s+/g, " ").trim();
    const fields: Field[] = [];
    const add = (
      name: ExtractionField,
      value: string | null | undefined,
      confidence: number,
      evidence: string,
    ) => {
      if (value === null || value === undefined) return;
      const trimmed = String(value).trim();
      if (!trimmed) return;
      if (fields.some((f) => f.name === name)) return;
      fields.push({ name, value: trimmed, confidence, evidence: evidence.slice(0, 300) });
    };

    // -- Title ------------------------------------------------------------
    const title = guessTitle(text, input.pageTitle);
    if (title) add("title", title.value, title.confidence, title.evidence);

    // -- Provider ---------------------------------------------------------
    if (input.sourceName) {
      add("providerName", input.sourceName, 0.9, `Given by the admin: ${input.sourceName}`);
    } else {
      const provider = guessProvider(plain);
      if (provider) add("providerName", provider.value, provider.confidence, provider.evidence);
    }

    // -- Money ------------------------------------------------------------
    const amounts = findMoney(plain);
    if (amounts.length) {
      const ceiling = amounts.find((a) => a.isMaximum) ?? amounts[amounts.length - 1];
      const floor = amounts.find((a) => a.isMinimum);
      add("fundingMax", String(ceiling.amount), ceiling.isMaximum ? 0.8 : 0.55, ceiling.evidence);
      if (floor && floor.amount !== ceiling.amount) {
        add("fundingMin", String(floor.amount), 0.7, floor.evidence);
      }
      add("currency", ceiling.currency, 0.85, ceiling.evidence);
    }

    // -- Dates ------------------------------------------------------------
    const dates = findDates(plain);
    const deadline = pickDeadline(plain, dates);
    if (deadline) add("applicationDeadline", deadline.iso, 0.8, deadline.evidence);
    if (/\brolling\b|\bno (fixed )?deadline\b|\bopen (all year|throughout)\b/i.test(plain)) {
      add("isRollingDeadline", "true", 0.75, excerpt(plain, /rolling|no fixed deadline/i));
    }

    // -- Contact and links ------------------------------------------------
    const url = findApplicationUrl(text, input.sourceUrl);
    if (url) add("applicationUrl", url.value, url.confidence, url.evidence);
    if (input.sourceUrl) add("officialSourceUrl", input.sourceUrl, 0.95, input.sourceUrl);

    // The trailing [\w] stops a sentence's full stop being read as part of the
    // address — "write to grants@x.org." must not yield "grants@x.org.".
    const email = plain.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/i)?.[0];
    if (email) add("contactEmail", email, 0.9, excerpt(plain, new RegExp(escapeRegex(email), "i")));

    // -- Statements we can quote -----------------------------------------
    const eligibility = findSection(text, /eligib|who can apply|criteria|open to/i);
    if (eligibility) add("eligibilitySummary", eligibility, 0.5, eligibility.slice(0, 200));

    const benefits = findSection(text, /benefit|what you (get|receive)|support (includes|offered)/i);
    if (benefits) add("benefitsSummary", benefits, 0.5, benefits.slice(0, 200));

    const process = findSection(text, /how to apply|application process|apply by|submit/i);
    if (process) add("applicationProcess", process, 0.45, process.slice(0, 200));

    // -- Flags that are only ever set from an explicit mention -------------
    if (/\bDPIIT\b/i.test(plain)) add("requiresDpiit", "true", 0.6, excerpt(plain, /DPIIT/i));
    if (/\budyam\b|\bMSME\b/i.test(plain))
      add("requiresMsmeUdyam", "true", 0.55, excerpt(plain, /udyam|MSME/i));
    if (/\bwomen[- ]?(led|founded|founder)/i.test(plain))
      add("requiresWomenFounder", "true", 0.6, excerpt(plain, /women[- ]?(led|founded|founder)/i));
    if (/\bstudent[- ]?(founder|entrepreneur)/i.test(plain))
      add("requiresStudentFounder", "true", 0.6, excerpt(plain, /student/i));
    if (/\bequity[- ]free\b|\bno equity\b|\bnon[- ]dilutive\b/i.test(plain))
      add("isEquityFree", "true", 0.75, excerpt(plain, /equity[- ]free|no equity|non[- ]dilutive/i));

    for (const [pattern, field] of BENEFIT_PATTERNS) {
      if (pattern.test(plain)) add(field, "true", 0.6, excerpt(plain, pattern));
    }

    // -- Geography --------------------------------------------------------
    const state = findState(plain, input.categories);
    if (state) add("state", state.value, state.confidence, state.evidence);
    if (/\bindia\b/i.test(plain)) add("country", "India", 0.6, excerpt(plain, /india/i));

    // -- Description ------------------------------------------------------
    const summary = firstSentences(plain, 2);
    if (summary.length >= 30) add("shortDescription", summary, 0.4, summary.slice(0, 200));
    if (text.trim().length > 200) add("fullDescription", text.trim().slice(0, 4000), 0.35, "");

    // -- Categories, matched against the live taxonomy --------------------
    const categorySuggestions = suggestCategories(plain, input.categories);
    const classification = classify(plain, categorySuggestions);

    const named = new Set(fields.map((f) => f.name));
    const unknownFields = IMPORTANT_FIELDS.filter((f) => !named.has(f));

    // A day and month with no year is a known trap: report it as unknown and
    // say why, rather than picking a year.
    if (!named.has("applicationDeadline") && hasDatelessDayMonth(plain)) {
      classification.reason +=
        " A date appears without a year, so the deadline was left unknown.";
    }

    return {
      classification,
      fields,
      unknownFields,
      categorySuggestions,
      newCategorySuggestions: [],
      provider: this.name,
      model: null,
      promptVersion: PROMPT_VERSION,
    };
  }
}

const BENEFIT_PATTERNS: [RegExp, ExtractionField][] = [
  [/\bmentor(ing|ship)?\b/i, "offersMentoring"],
  [/\bincubat(ion|e|or)\b/i, "offersIncubation"],
  [/\bnetwork(ing)?\b/i, "offersNetworking"],
  [/\binvestor (access|connect|introduction)/i, "offersInvestorAccess"],
  [/\blab (access|facilit)/i, "offersLabAccess"],
  [/\bpilot\b/i, "offersPilotOpportunities"],
  [/\bmarket access\b/i, "offersMarketAccess"],
  [/\bcorporate (partner|connect)/i, "offersCorporatePartnerships"],
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerpt(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  if (!match || match.index === undefined) return "";
  const start = Math.max(0, match.index - 60);
  return text.slice(start, match.index + match[0].length + 60).trim();
}

const PROGRAMME_WORD =
  "programme|program|challenge|grant|fellowship|accelerator|incubation|fund|award|competition|scheme|initiative|call|cohort";

const TITLE_STOPWORDS =
  /^(?:for|its|the|a|an|of|to|in|on|at|and|our|their|this|new|has|have|opened|announced|launched|applications?)\s+/i;

function guessTitle(
  text: string,
  pageTitle?: string | null,
): { value: string; confidence: number; evidence: string } | null {
  if (pageTitle && pageTitle.trim().length > 8) {
    return { value: cleanTitle(pageTitle), confidence: 0.7, evidence: pageTitle };
  }

  // Already-capitalised programme names, e.g. "Vidyut Clean Energy Challenge".
  const properNoun = text.match(
    new RegExp(
      String.raw`\b([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,6}\s+(?:${PROGRAMME_WORD})(?:\s+\d{4})?)\b`,
      "i",
    ),
  );
  if (properNoun && /[A-Z]/.test(properNoun[1][0])) {
    return { value: cleanTitle(properNoun[1]), confidence: 0.6, evidence: properNoun[0] };
  }

  // Lowercase prose — "opened applications for its 2026 climate startup
  // program". Take the words leading up to the programme word and drop the
  // grammatical scaffolding in front of them.
  const phrase = text.match(
    new RegExp(String.raw`((?:[\w&'-]+\s+){1,6}(?:${PROGRAMME_WORD}))\b`, "i"),
  );
  if (phrase) {
    let candidate = phrase[1].trim();
    let previous = "";
    while (candidate !== previous) {
      previous = candidate;
      candidate = candidate.replace(TITLE_STOPWORDS, "");
    }
    if (candidate.split(/\s+/).length >= 2) {
      return {
        value: cleanTitle(titleCase(candidate)),
        confidence: 0.4,
        evidence: phrase[0],
      };
    }
  }

  // Last resort: the opening sentence, clipped.
  const firstSentence = text
    .split(/(?<=[.!?])\s+|\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 10);
  if (firstSentence) {
    return {
      value: cleanTitle(firstSentence.slice(0, 140)),
      confidence: 0.25,
      evidence: firstSentence,
    };
  }

  return null;
}

function titleCase(value: string): string {
  const minor = /^(of|the|a|an|and|for|in|on|to|with)$/i;
  return value
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && minor.test(word)
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function cleanTitle(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*[|–—-]\s*(home|official site|apply now)\s*$/i, "")
    .trim()
    .slice(0, 200);
}

function guessProvider(
  text: string,
): { value: string; confidence: number; evidence: string } | null {
  const match = text.match(
    /\b([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,5}\s+(?:Foundation|Trust|Mission|Council|Ministry|Department|University|Institute|Authority|Corporation|Board|Agency|Association|Federation|Bank|Fund|Group|Labs?|Technologies))\b/,
  );
  if (!match) return null;
  return { value: match[1].trim(), confidence: 0.55, evidence: excerpt(text, new RegExp(escapeRegex(match[1]))) };
}

function pickDeadline(
  text: string,
  dates: { iso: string; evidence: string; index: number }[],
): { iso: string; evidence: string } | null {
  if (dates.length === 0) return null;

  // Prefer a date sitting next to deadline language.
  const cue = /\b(deadline|last date|closes?|closing|apply by|submit by|due)\b/i;
  const near = dates.find((d) => cue.test(d.evidence));
  const chosen = near ?? (dates.length === 1 ? dates[0] : null);
  if (!chosen) return null;

  const asDate = new Date(`${chosen.iso}T00:00:00.000Z`);
  if (Number.isNaN(asDate.getTime())) return null;
  return { iso: chosen.iso, evidence: chosen.evidence };
}

function findApplicationUrl(
  text: string,
  sourceUrl?: string | null,
): { value: string; confidence: number; evidence: string } | null {
  const matches = [
    ...text.matchAll(/\b((?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+(?:\/[\w./?%&=#+-]*)?)/g),
  ]
    .map((m) => m[1])
    .filter((candidate) => /\.[a-z]{2,}/i.test(candidate))
    .filter((candidate) => !/@/.test(candidate))
    .filter((candidate) => candidate !== sourceUrl);

  const applyish = matches.find((m) => /apply|application|form|register|submit/i.test(m));
  const chosen = applyish ?? matches[0];
  if (!chosen) return null;

  const value = /^https?:\/\//i.test(chosen) ? chosen : `https://${chosen}`;
  return {
    value: value.replace(/[.,;)]+$/, ""),
    confidence: applyish ? 0.75 : 0.5,
    evidence: excerpt(text, new RegExp(escapeRegex(chosen))),
  };
}

function findSection(text: string, heading: RegExp): string | null {
  const lines = text.split(/\n+/);
  const index = lines.findIndex((line) => heading.test(line) && line.trim().length < 120);
  if (index === -1) {
    const sentence = text
      .split(/(?<=[.!?])\s+/)
      .find((s) => heading.test(s) && s.trim().length > 30);
    return sentence ? sentence.trim().slice(0, 1200) : null;
  }
  const body = lines
    .slice(index, index + 8)
    .join("\n")
    .trim();
  return body.length > 20 ? body.slice(0, 1200) : null;
}

function findState(
  text: string,
  categories: ExtractionInput["categories"],
): { value: string; confidence: number; evidence: string } | null {
  const states = categories.filter((c) => c.type === "GEOGRAPHY" && c.parent);
  for (const state of states) {
    const pattern = new RegExp(`\\b${escapeRegex(state.name)}\\b`, "i");
    if (pattern.test(text)) {
      return { value: state.name, confidence: 0.6, evidence: excerpt(text, pattern) };
    }
  }
  return null;
}

function firstSentences(text: string, count: number): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .slice(0, count)
    .join(" ")
    .trim()
    .slice(0, 380);
}

/**
 * Matches the live taxonomy by name, so a category an admin adds today is
 * suggestible today. Nothing about the category list is baked into this code.
 */
function suggestCategories(
  text: string,
  categories: ExtractionInput["categories"],
): { slug: string; confidence: number; reason: string }[] {
  const suggestions: { slug: string; confidence: number; reason: string }[] = [];

  for (const category of categories) {
    const terms = [category.name, ...ALIASES[category.slug] ?? []];
    for (const term of terms) {
      if (term.length < 4) continue;
      const pattern = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
      if (pattern.test(text)) {
        suggestions.push({
          slug: category.slug,
          confidence: term === category.name ? 0.7 : 0.55,
          reason: `The material mentions "${term}".`,
        });
        break;
      }
    }
  }

  return suggestions.slice(0, 12);
}

/** A few words that mean a category without naming it. */
const ALIASES: Record<string, string[]> = {
  grants: ["grant", "grants", "non-dilutive", "equity-free funding"],
  "incubation-programs": ["incubation", "incubator", "incubated"],
  "acceleration-programs": ["accelerator", "acceleration", "cohort"],
  "seed-funds": ["seed funding", "seed capital", "seed investment"],
  "csr-funding": ["CSR", "corporate social responsibility"],
  "awards-and-competitions": ["competition", "award", "prize", "hackathon"],
  fellowships: ["fellowship", "fellow"],
  subsidies: ["subsidy", "reimbursement"],
  "debt-and-loans": ["loan", "credit guarantee", "venture debt"],
  "innovation-challenges": ["challenge", "problem statement"],
  "pilot-opportunities": ["pilot", "proof of concept", "PoC"],
  "corporate-innovation": ["open innovation", "corporate partnership"],
  climatetech: ["climate", "decarbonis", "decarboniz", "emissions", "clean energy"],
  cleantech: ["cleantech", "clean technology"],
  agritech: ["agritech", "agriculture", "farming", "post-harvest"],
  healthtech: ["healthtech", "healthcare", "medical"],
  biotech: ["biotech", "life sciences"],
  deeptech: ["deeptech", "deep tech", "deep-tech"],
  fintech: ["fintech", "financial services"],
  edtech: ["edtech", "education technology"],
  robotics: ["robotics", "robot"],
  manufacturing: ["manufacturing", "factory", "production line"],
  "women-founders": ["women-led", "women founders", "women entrepreneurs"],
  "student-founders": ["student founders", "student entrepreneurs"],
  prototype: ["prototype"],
  mvp: ["MVP", "minimum viable product"],
  "idea-stage": ["idea stage", "ideation"],
};

function classify(
  text: string,
  suggestions: { slug: string; confidence: number }[],
): { kind: ExtractionOutcome["classification"]["kind"]; confidence: number; reason: string } {
  const has = (slug: string) => suggestions.some((s) => s.slug === slug);
  const applyish = /\bappl(y|ication|ications)\b|\bsubmit\b|\bdeadline\b|\blast date\b|\beligib/i.test(text);

  const map: [string, ExtractionOutcome["classification"]["kind"]][] = [
    ["csr-funding", "CSR_FUNDING"],
    ["grants", "GRANT"],
    ["seed-funds", "SEED_FUND"],
    ["incubation-programs", "INCUBATION_PROGRAM"],
    ["acceleration-programs", "ACCELERATION_PROGRAM"],
    ["awards-and-competitions", "AWARD_OR_COMPETITION"],
    ["fellowships", "FELLOWSHIP"],
    ["pilot-opportunities", "PILOT_OPPORTUNITY"],
    ["corporate-innovation", "CORPORATE_INNOVATION"],
    ["market-access-programs", "MARKET_ACCESS"],
    ["procurement-opportunities", "PROCUREMENT_OPPORTUNITY"],
  ];

  for (const [slug, kind] of map) {
    if (has(slug)) {
      return {
        kind,
        confidence: applyish ? 0.6 : 0.4,
        reason: `Matched on the ${slug.replace(/-/g, " ")} category${applyish ? " and the material talks about applying" : ""}. Pattern matching only — no model was used, so please check this.`,
      };
    }
  }

  return {
    kind: applyish ? "POSSIBLE_FUNDING_OPPORTUNITY" : "UNKNOWN",
    confidence: applyish ? 0.35 : 0.15,
    reason:
      "No AI provider is configured, so this was classified by pattern matching alone. It needs a human read.",
  };
}
