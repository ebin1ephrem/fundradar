import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CACHE_SECONDS, PUBLIC_SETTINGS_TAG } from "@/lib/cache-tags";
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

const getCachedLeadGateSettings = unstable_cache(async (): Promise<LeadGateSettings> => {
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
}, ["public-lead-gate-settings-v1"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: [PUBLIC_SETTINGS_TAG],
});

export const getLeadGateSettings = cache(getCachedLeadGateSettings);

const getCachedGatedSections = unstable_cache(async (): Promise<GateableSection[]> => {
  const row = await prisma.setting.findUnique({ where: { key: "gatedSections" } });
  if (!row || !Array.isArray(row.value)) return DEFAULT_GATED_SECTIONS;
  const valid = new Set<string>(GATEABLE_SECTIONS.map((s) => s.key));
  return (row.value as unknown[])
    .filter((v): v is string => typeof v === "string" && valid.has(v))
    .map((v) => v as GateableSection);
}, ["public-gated-sections-v1"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: [PUBLIC_SETTINGS_TAG],
});

export const getGatedSections = cache(getCachedGatedSections);

export async function setSetting(key: string, value: unknown): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value: value as never },
    create: { key, value: value as never },
  });
}
