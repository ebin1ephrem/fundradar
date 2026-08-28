import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import { ExtractionSchema } from "./schema";
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import type { ExtractionInput, ExtractionOutcome, ExtractionProvider } from "./types";

/** Source pages can be long; this keeps one request inside a sane budget. */
const MAX_INPUT_CHARS = 120_000;

const RewriteSchema = z.object({
  short: z.string(),
  full: z.string(),
});

export class AnthropicExtractionProvider implements ExtractionProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async extract(input: ExtractionInput): Promise<ExtractionOutcome> {
    const text = clampText(input.text);

    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: zodOutputFormat(ExtractionSchema),
      },
      messages: [{ role: "user", content: buildUserPrompt({ ...input, text }) }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error(
        `Extraction refused: ${response.stop_details?.explanation ?? "no explanation given"}`,
      );
    }

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("The model returned no structured output.");

    return {
      ...parsed,
      provider: this.name,
      model: this.model,
      promptVersion: PROMPT_VERSION,
      tokensIn: response.usage?.input_tokens,
      tokensOut: response.usage?.output_tokens,
    };
  }

  /**
   * Rewrites institutional prose into plain language. The facts are passed in
   * separately and the model is told not to add to them — a description that
   * invents a benefit is the same failure as a hallucinated deadline.
   */
  async rewriteDescription(input: {
    text: string;
    facts: string;
  }): Promise<{ short: string; full: string } | null> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 4000,
      system: `You rewrite funding programme copy for FundRadar so founders can understand it quickly.

Say what a startup actually gets and what they have to do. Cut the institutional throat-clearing — "seeks to catalyse and empower innovative entrepreneurial ventures" becomes "selected startups receive funding and incubation support".

Never change a fact. Do not alter or add: eligibility, funding amounts, dates, benefits, or requirements. If the source does not mention a benefit, it does not go in. Every claim must already be present in the material you are given.`,
      output_config: { format: zodOutputFormat(RewriteSchema) },
      messages: [
        {
          role: "user",
          content: `## Confirmed facts, do not contradict these\n\n${input.facts}\n\n## Source material\n\n${clampText(input.text, 40_000)}`,
        },
      ],
    });

    return response.parsed_output ?? null;
  }
}

/**
 * Truncation is visible, not silent: the marker tells the model (and any admin
 * reading the extraction run) that it did not see everything.
 */
function clampText(text: string, limit = MAX_INPUT_CHARS): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n[Material truncated at ${limit.toLocaleString("en-IN")} characters. Fields that appear only after this point will be missing.]`;
}
