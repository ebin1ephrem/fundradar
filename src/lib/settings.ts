import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_GATE,
  DEFAULT_GATED_SECTIONS,
  GATEABLE_SECTIONS,
  type GateableSection,
  type LeadGateSettings,
} from "./settings-schema";

export {
  GATEABLE_SECTIONS,
  type GateableSection,
  type LeadGateSettings,
} from "./settings-schema";

export const getLeadGateSettings = cache(async (): Promise<LeadGateSettings> => {
  const row = await prisma.setting.findUnique({ where: { key: "leadGate" } });
  if (!row || typeof row.value !== "object" || row.value === null) {
    return DEFAULT_GATE;
  }
  const value = row.value as Partial<LeadGateSettings>;
  return {
    enabled: value.enabled ?? DEFAULT_GATE.enabled,
    opportunityViewsBeforePrompt: Math.max(
      1,
      Number(
        value.opportunityViewsBeforePrompt ??
          DEFAULT_GATE.opportunityViewsBeforePrompt,
      ),
    ),
    promptOnUnlockAction:
      value.promptOnUnlockAction ?? DEFAULT_GATE.promptOnUnlockAction,
  };
});

export const getGatedSections = cache(async (): Promise<GateableSection[]> => {
  const row = await prisma.setting.findUnique({ where: { key: "gatedSections" } });
  if (!row || !Array.isArray(row.value)) return DEFAULT_GATED_SECTIONS;
  const valid = new Set<string>(GATEABLE_SECTIONS.map((s) => s.key));
  return (row.value as unknown[])
    .filter((v): v is string => typeof v === "string" && valid.has(v))
    .map((v) => v as GateableSection);
});

export async function setSetting(key: string, value: unknown): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value: value as never },
    create: { key, value: value as never },
  });
}
