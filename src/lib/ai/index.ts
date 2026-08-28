import "server-only";
import { env, has } from "@/lib/env";
import { AnthropicExtractionProvider } from "./anthropic";
import { HeuristicExtractionProvider } from "./heuristic";
import type { ExtractionInput, ExtractionOutcome, ExtractionProvider } from "./types";

export const fallbackProvider = new HeuristicExtractionProvider();

export function extractionProvider(): ExtractionProvider {
  if (has.ai()) {
    return new AnthropicExtractionProvider(env.anthropicApiKey!, env.anthropicModel);
  }
  return fallbackProvider;
}

/**
 * Runs the configured provider, and falls back to pattern matching if the model
 * call fails. A failed extraction still produces a draft an admin can fix, which
 * is better than losing the material — and the run records what happened.
 */
export async function runExtraction(
  input: ExtractionInput,
): Promise<{ outcome: ExtractionOutcome; error: string | null }> {
  const provider = extractionProvider();

  try {
    return { outcome: await provider.extract(input), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    if (provider.name === fallbackProvider.name) {
      throw error;
    }
    const outcome = await fallbackProvider.extract(input);
    return {
      outcome: {
        ...outcome,
        classification: {
          ...outcome.classification,
          reason: `${outcome.classification.reason} The AI provider failed first: ${message}`,
        },
      },
      error: message,
    };
  }
}

export * from "./schema";
export * from "./types";
