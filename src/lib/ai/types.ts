import type { ExtractionOutput } from "./schema";

export type ExtractionInput = {
  /** The material to read. Never truncated silently — see chunking in provider. */
  text: string;
  /** Where it came from, shown to the model as context only. */
  sourceUrl?: string | null;
  sourceName?: string | null;
  pageTitle?: string | null;
  /** The live taxonomy. Categories are never hard-coded into a prompt. */
  categories: { slug: string; name: string; type: string; parent?: string | null }[];
};

export type ExtractionOutcome = ExtractionOutput & {
  provider: string;
  model: string | null;
  promptVersion: string;
  tokensIn?: number;
  tokensOut?: number;
  raw?: string;
};

export interface ExtractionProvider {
  readonly name: string;
  readonly model: string | null;
  extract(input: ExtractionInput): Promise<ExtractionOutcome>;
  /**
   * Rewrites a description in plain language without changing any fact.
   * Returns null when the provider cannot do it (the fallback cannot).
   */
  rewriteDescription?(input: {
    text: string;
    facts: string;
  }): Promise<{ short: string; full: string } | null>;
}
