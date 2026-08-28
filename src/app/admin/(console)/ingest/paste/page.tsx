import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { has } from "@/lib/env";
import { PasteForm } from "./form";

export const metadata = { title: "Paste text" };
export const dynamic = "force-dynamic";

export default async function PasteTextPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Create an opportunity from text"
        breadcrumbs={[
          { label: "Opportunities", href: "/admin/opportunities" },
          { label: "Add", href: "/admin/opportunities/new" },
          { label: "Paste text" },
        ]}
        description="Paste an email, announcement, WhatsApp message, LinkedIn post, programme note or anything else. FundRadar will organise it into a draft for you to review."
      />
      <PageBody>
        <PasteForm hasAi={has.ai()} />
      </PageBody>
    </>
  );
}
