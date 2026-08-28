import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { pickerCategories } from "@/lib/queries/categories";
import { OpportunityForm } from "../opportunity-form";
import { saveOpportunityAction } from "../actions";

export const metadata = { title: "Manual entry" };
export const dynamic = "force-dynamic";

export default async function ManualOpportunityPage() {
  await requireAdmin();
  const categories = await pickerCategories();

  return (
    <>
      <PageHeader
        title="Enter an opportunity"
        breadcrumbs={[
          { label: "Opportunities", href: "/admin/opportunities" },
          { label: "Add", href: "/admin/opportunities/new" },
          { label: "Manual" },
        ]}
        description="The same schema every extracted record uses. Record what the provider states — leave anything they do not state empty."
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
