import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { LeadGateProvider } from "@/components/lead/gate-context";
import { LeadModal } from "@/components/lead/lead-modal";
import { getLeadGateSettings } from "@/lib/settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await getLeadGateSettings();

  return (
    <LeadGateProvider
      enabled={gate.enabled}
      viewsBeforePrompt={gate.opportunityViewsBeforePrompt}
    >
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
      <LeadModal />
    </LeadGateProvider>
  );
}
