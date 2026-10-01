import { Suspense } from "react";
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
        <Suspense
          fallback={
            <div
              className="h-[66px] border-b border-line lg:h-[74px]"
              aria-hidden="true"
            />
          }
        >
          <SiteHeader />
        </Suspense>
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
      <LeadModal />
    </LeadGateProvider>
  );
}
