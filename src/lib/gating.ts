import "server-only";
import { getGatedSections, getLeadGateSettings, type GateableSection } from "@/lib/settings";

export type GateDecision = {
  /** Whether the viewer can see gated sections. */
  unlocked: boolean;
  /** Sections currently behind the gate. Empty when the viewer is unlocked. */
  locked: Set<GateableSection>;
  isLocked: (section: GateableSection) => boolean;
};

/**
 * Basic information is always public — title, provider, summary, categories,
 * funding range, deadline, location and stage. A visitor can browse, search and
 * filter the whole directory without giving anything up. Only the deeper
 * detail sits behind the one-step lead capture, and which sections those are is
 * an admin setting, not a hard-coded list.
 */
export async function resolveGate(isIdentified: boolean): Promise<GateDecision> {
  const settings = await getLeadGateSettings();

  if (!settings.enabled || isIdentified) {
    return { unlocked: true, locked: new Set(), isLocked: () => false };
  }

  const locked = new Set(await getGatedSections());
  return {
    unlocked: false,
    locked,
    isLocked: (section) => locked.has(section),
  };
}
