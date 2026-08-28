"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { audit } from "@/lib/audit";
import { setSetting } from "@/lib/settings";
import { GATEABLE_SECTIONS } from "@/lib/settings-schema";

export type SettingsState = { ok?: boolean; error?: string };

export async function updateGateSettingsAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const admin = await requireAdmin();

  const valid = new Set<string>(GATEABLE_SECTIONS.map((s) => s.key));
  const sections = formData
    .getAll("sections")
    .map(String)
    .filter((s) => valid.has(s));

  const views = Number(formData.get("views") ?? 3);
  const gate = {
    enabled: formData.get("enabled") === "on",
    opportunityViewsBeforePrompt:
      Number.isFinite(views) && views >= 1 && views <= 20 ? Math.round(views) : 3,
    promptOnUnlockAction: formData.get("promptOnUnlockAction") === "on",
  };

  await setSetting("gatedSections", sections);
  await setSetting("leadGate", gate);

  await audit({
    adminUserId: admin.id,
    action: "settings.lead_gate",
    entityType: "Setting",
    entityId: "leadGate",
    summary: gate.enabled
      ? `Lead gate on, ${sections.length} sections gated`
      : "Lead gate turned off",
    after: { gate, sections },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/opportunities", "layout");
  return { ok: true };
}
