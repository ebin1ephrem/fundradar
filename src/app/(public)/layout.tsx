import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { LeadGateProvider } from "@/components/lead/gate-context";
import { LeadModal } from "@/components/lead/lead-modal";
import { getViewer } from "@/lib/leads/identity";
import { getLeadGateSettings } from "@/lib/settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ lead }, gate] = await Promise.all([getViewer(), getLeadGateSettings()]);

  return (
    <LeadGateProvider
      identified={Boolean(lead)}
      enabled={gate.enabled}
      viewsBeforePrompt={gate.opportunityViewsBeforePrompt}
    >
      <div className="flex min-h-dvh flex-col">
        <SiteHeader signedIn={Boolean(lead)} name={lead?.name ?? null} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
      <LeadModal />
    </LeadGateProvider>
  );
}
