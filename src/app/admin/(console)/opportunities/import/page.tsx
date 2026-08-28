import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { ImportForm } from "./form";

export const metadata = { title: "Import seed data" };
export const dynamic = "force-dynamic";

const FIELDS = [
  ["seed_id", "Stable identity for this seed set. Re-running the file will not create a second draft."],
  ["title", "Required."],
  ["provider", "Organisation running the programme."],
  ["opportunity_type / funding_type", "Become category suggestions."],
  ["funding_min_inr / funding_max_inr", "Numbers only. Leave blank if not stated."],
  ["program_corpus_inr", "Programme-level corpus — recorded as funding notes, never as a per-startup maximum."],
  ["deadline", "Only used when a year is written down."],
  ["startup_stages / industries / technologies", "Comma or pipe separated."],
  ["eligibility_summary / benefits / description", "Free text."],
  ["application_url / source_url", "Links."],
  ["suggested_categories", "Comma separated. Suggestions only."],
  ["admin_notes", "Kept as important notes on the draft."],
];

export default async function ImportSeedPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Import seed data"
        breadcrumbs={[
          { label: "Opportunities", href: "/admin/opportunities" },
          { label: "Import seed data" },
        ]}
        description="Bulk-load a JSON or CSV file of opportunities as drafts. They travel the same route as everything else — pending review, then a person approves and publishes."
      />

      <PageBody>
        <div className="mb-8 max-w-[70ch] rounded-[12px] border border-line bg-subtle p-5">
          <p className="text-[14px] font-medium">What this does and does not do</p>
          <ul className="mt-2.5 grid gap-1.5 text-[13.5px] leading-relaxed text-muted">
            <li>
              Every record becomes a draft at <span className="text-ink">PENDING_REVIEW</span>,
              inactive, and invisible to the public site.
            </li>
            <li>Duplicate detection runs against everything already in the database.</li>
            <li>
              Categories named in the file are recorded as{" "}
              <span className="text-ink">suggestions</span> — none is applied
              until you accept it.
            </li>
            <li>
              A blank, <span className="text-ink">UNKNOWN</span> or{" "}
              <span className="text-ink">N/A</span> value stays unknown. Nothing
              is filled in on your behalf.
            </li>
            <li>No AI runs on these records — the file already carries the structure.</li>
          </ul>
        </div>

        <ImportForm />

        <section className="mt-10 max-w-[80ch]">
          <h2 className="text-[15px] font-medium tracking-[-0.02em]">
            Fields the importer reads
          </h2>
          <dl className="mt-4 grid gap-2.5">
            {FIELDS.map(([name, note]) => (
              <div key={name} className="grid gap-0.5 sm:grid-cols-[280px_1fr] sm:gap-4">
                <dt className="font-mono text-[12.5px] text-ink">{name}</dt>
                <dd className="text-[13px] text-muted">{note}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[13px] text-muted">
            Anything else in the file is kept with the original record but is
            not mapped onto a column.
          </p>
        </section>
      </PageBody>
    </>
  );
}
