/**
 * Indian funding copy writes amounts as "₹25 lakh", "Rs. 2,50,000", "upto 50L",
 * "INR 1 crore". Parsing these is the difference between a useful draft and a
 * blank funding field, so it is done explicitly rather than left to a regex
 * that only understands commas.
 */

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  l: 100_000,
  lakh: 100_000,
  lakhs: 100_000,
  lac: 100_000,
  lacs: 100_000,
  m: 1_000_000,
  mn: 1_000_000,
  million: 1_000_000,
  cr: 10_000_000,
  crore: 10_000_000,
  crores: 10_000_000,
  bn: 1_000_000_000,
  billion: 1_000_000_000,
};

const SYMBOL_CURRENCY: Record<string, string> = {
  "₹": "INR",
  rs: "INR",
  "rs.": "INR",
  inr: "INR",
  $: "USD",
  usd: "USD",
  "€": "EUR",
  eur: "EUR",
  "£": "GBP",
  gbp: "GBP",
};

export type MoneyMatch = {
  amount: number;
  currency: string;
  /** True when the text framed it as a ceiling ("up to", "maximum of"). */
  isMaximum: boolean;
  isMinimum: boolean;
  evidence: string;
};

const AMOUNT = String.raw`(\d[\d,.]*)\s*(crores?|cr|lakhs?|lacs?|l|thousand|k|million|mn|m|billion|bn)?`;
const CURRENCY = String.raw`(₹|\$|€|£|rs\.?|inr|usd|eur|gbp)`;

const PATTERNS = [
  // ₹25 lakh / Rs. 2,50,000 / $50,000
  new RegExp(String.raw`${CURRENCY}\s*${AMOUNT}`, "gi"),
  // 25 lakh rupees / 50000 INR
  new RegExp(String.raw`${AMOUNT}\s*${CURRENCY}`, "gi"),
  // 25 lakh / 50L — a bare number with a scale word still means money here
  new RegExp(
    String.raw`\b(\d[\d,.]*)\s*(crores?|cr|lakhs?|lacs?|l|k)\b`,
    "gi",
  ),
];

const MAX_HINTS = /\b(up ?to|upto|maximum|max\.?|as much as|not exceeding|ceiling of)\b/i;
const MIN_HINTS = /\b(at least|minimum|min\.?|starting (at|from)|from)\b/i;

export function findMoney(text: string): MoneyMatch[] {
  const found: MoneyMatch[] = [];
  const seen = new Set<string>();

  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const groups = match.slice(1).filter((g) => g !== undefined);
      const rawNumber = groups.find((g) => /^\d/.test(g));
      if (!rawNumber) continue;

      const scale = groups.find((g) => g && MULTIPLIERS[g.toLowerCase()]);
      const symbol = groups.find((g) => g && SYMBOL_CURRENCY[g.toLowerCase()]);

      const base = Number(rawNumber.replace(/,/g, ""));
      if (!Number.isFinite(base) || base <= 0) continue;

      const amount = Math.round(base * (scale ? MULTIPLIERS[scale.toLowerCase()] : 1));
      // A bare small number with no scale and no symbol is probably a count,
      // not an amount ("3 months", "5 startups").
      if (!scale && !symbol && amount < 1000) continue;

      const start = Math.max(0, match.index - 40);
      const evidence = text.slice(start, match.index + match[0].length + 20).trim();
      const before = text.slice(start, match.index);

      const key = `${amount}:${match.index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      found.push({
        amount,
        currency: symbol ? SYMBOL_CURRENCY[symbol.toLowerCase()] : "INR",
        isMaximum: MAX_HINTS.test(before),
        isMinimum: MIN_HINTS.test(before) && !MAX_HINTS.test(before),
        evidence,
      });
    }
  }

  return found.sort((a, b) => a.amount - b.amount);
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
  sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

export type DateMatch = { iso: string; evidence: string; index: number };

/**
 * Only returns a date when the year is written down. "last date Oct 15" comes
 * back empty on purpose — guessing the year is exactly the kind of invention
 * that makes a deadline untrustworthy.
 */
export function findDates(text: string): DateMatch[] {
  const results: DateMatch[] = [];
  const push = (y: number, m: number, d: number, match: RegExpExecArray) => {
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return;
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const start = Math.max(0, match.index - 40);
    results.push({
      iso,
      evidence: text.slice(start, match.index + match[0].length + 10).trim(),
      index: match.index,
    });
  };

  const monthNames = Object.keys(MONTHS).join("|");
  const patterns: [RegExp, (m: RegExpExecArray) => [number, number, number] | null][] = [
    // 2026-10-15
    [/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (m) => [+m[1], +m[2], +m[3]]],
    // 15 October 2026 / 15th Oct, 2026
    [
      new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(${monthNames})\.?,?\s+(\d{4})\b`, "gi"),
      (m) => [+m[3], MONTHS[m[2].toLowerCase()], +m[1]],
    ],
    // October 15, 2026
    [
      new RegExp(String.raw`\b(${monthNames})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b`, "gi"),
      (m) => [+m[3], MONTHS[m[1].toLowerCase()], +m[2]],
    ],
    // 15/10/2026 — day first, which is the Indian convention
    [/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (m) => [+m[3], +m[2], +m[1]]],
  ];

  for (const [pattern, map] of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const parts = map(match);
      if (parts) push(parts[0], parts[1], parts[2], match);
    }
  }

  return results.sort((a, b) => a.index - b.index);
}

/** True when a day and month appear with no year anywhere near them. */
export function hasDatelessDayMonth(text: string): boolean {
  const monthNames = Object.keys(MONTHS).join("|");
  const loose = new RegExp(
    String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(${monthNames})\b(?!\.?,?\s+\d{4})`,
    "i",
  );
  const looseReversed = new RegExp(
    String.raw`\b(${monthNames})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?!,?\s+\d{4})`,
    "i",
  );
  return loose.test(text) || looseReversed.test(text);
}
