/**
 * Query parsing for the Postgres search provider.
 *
 * Kept separate from the SQL so the tokenising rules can be reasoned about —
 * and tested — without a database.
 */

/** Snowball's English stopword list, which Postgres' 'english' config also uses. */
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "as", "at", "be", "because", "been", "before", "being", "below",
  "between", "both", "but", "by", "can", "did", "do", "does", "doing", "down",
  "during", "each", "few", "for", "from", "further", "had", "has", "have",
  "having", "he", "her", "here", "hers", "herself", "him", "himself", "his",
  "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me",
  "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on",
  "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over",
  "own", "s", "same", "she", "should", "so", "some", "such", "t", "than",
  "that", "the", "their", "theirs", "them", "themselves", "then", "there",
  "these", "they", "this", "those", "through", "to", "too", "under", "until",
  "up", "very", "was", "we", "were", "what", "when", "where", "which", "while",
  "who", "whom", "why", "will", "with", "you", "your", "yours", "yourself",
  "yourselves",
]);

const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 40;
const MAX_PHRASE_LENGTH = 120;

export type ParsedQuery = {
  /** The raw phrase, used for trigram similarity. */
  phrase: string;
  /** Content terms, stopwords removed. */
  terms: string[];
  /** Prefixed tsquery terms, one per content term. */
  prefixed: string[];
  /** All terms ANDed — a precise match, used only as a ranking bonus. */
  andQuery: string;
  /** All terms ORed — the matching query, paired with `minMatch`. */
  orQuery: string;
  /**
   * How many terms a record must contain to qualify. Pure OR matching floods:
   * one common word like "startups" pulls in the entire directory. Requiring a
   * majority of the terms keeps long queries specific without the
   * all-or-nothing behaviour of ANDing everything.
   */
  minMatch: number;
  /** ILIKE patterns used to match category names. */
  patterns: string[];
};

/**
 * Returns null when there is nothing searchable — an empty box, or a phrase
 * made entirely of stopwords. Callers treat null as "no text filter" rather
 * than "match nothing", so a junk query shows the directory instead of an
 * empty page.
 *
 * Terms are reduced to letters and digits before they are interpolated into a
 * tsquery, so nothing a visitor types can change the query's structure.
 */
export function parseQuery(input?: string | null): ParsedQuery | null {
  const phrase = (input ?? "").trim().slice(0, MAX_PHRASE_LENGTH);
  if (phrase.length < 2) return null;

  const tokens = phrase.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const terms = tokens
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => t.slice(0, MAX_TERM_LENGTH))
    .filter((t, i, all) => all.indexOf(t) === i)
    .slice(0, MAX_TERMS);

  if (terms.length === 0) return null;

  const prefixed = terms.map((t) => `${t}:*`);

  return {
    phrase,
    terms,
    prefixed,
    andQuery: prefixed.join(" & "),
    orQuery: prefixed.join(" | "),
    minMatch: minimumMatch(terms.length),
    patterns: terms.map((t) => `%${t}%`),
  };
}

/**
 * One or two terms: any match will do, because short queries are usually the
 * whole intent ("biotech", "kerala grants"). Three or more: require a majority,
 * so "deeptech grant for climate startups" stops matching every record that
 * merely contains the word "startups".
 */
export function minimumMatch(termCount: number): number {
  if (termCount <= 2) return 1;
  return Math.ceil(termCount * 0.6);
}
