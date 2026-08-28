import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { pickerCategories } from "@/lib/queries/categories";
import { OpportunityForm } from "../opportunity-form";
import { saveOpportunityAction } from "../actions";

export const metadata = { title: "Add opportunity" };
export const dynamic = "force-dynamic";

export default async function NewOpportunityPage() {
  await requireAdmin();
  const categories = await pickerCategories();

  return (
    <>
      <PageHeader
        title="Add opportunity"
        breadcrumbs={[
          { label: "Opportunities", href: "/admin/opportunities" },
          { label: "Add" },
        ]}
        description="The same schema extracted records use. Record what the provider states — leave anything they do not state empty."
      />
      <PageBody>
        <OpportunityForm
          action={saveOpportunityAction}
          categories={categories}
          selectedCategoryIds={[]}
          primaryCategoryId={null}
        />
      </PageBody>
    </>
  );
}
