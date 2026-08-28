import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { SourceForm } from "../source-form";

export const metadata = { title: "Add a source" };
export const dynamic = "force-dynamic";

export default async function NewSourcePage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Add a source"
        breadcrumbs={[{ label: "Sources", href: "/admin/sources" }, { label: "Add" }]}
        description="A page or section we check on a schedule. For a single opportunity you already have, add a URL instead."
      />
      <PageBody>
        <SourceForm />
      </PageBody>
    </>
  );
}
