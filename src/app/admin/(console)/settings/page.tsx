import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { getGatedSections, getLeadGateSettings } from "@/lib/settings";
import { GateSettingsForm } from "./form";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireAdmin();
  const [gate, gated] = await Promise.all([
    getLeadGateSettings(),
    getGatedSections(),
  ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="How much a visitor sees before you ask who they are."
      />
      <PageBody>
        <GateSettingsForm gate={gate} gatedSections={gated} />
      </PageBody>
    </>
  );
}
