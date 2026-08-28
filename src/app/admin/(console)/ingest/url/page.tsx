import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { UrlForm } from "./form";

export const metadata = { title: "Add a URL" };
export const dynamic = "force-dynamic";

export default async function AddUrlPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Add one opportunity by URL"
        breadcrumbs={[
          { label: "Opportunities", href: "/admin/opportunities" },
          { label: "Add", href: "/admin/opportunities/new" },
          { label: "Add URL" },
        ]}
        description="Give us the page for a single programme. To watch a whole site for new programmes, add a source instead."
      />
      <PageBody>
        <UrlForm />
      </PageBody>
    </>
  );
}
