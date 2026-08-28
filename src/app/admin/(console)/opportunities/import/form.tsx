"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importSeedAction, type ImportState } from "./actions";
import { Field, FormError } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  CREATED: "border-ok/30 bg-ok/5 text-ok",
  MATCHED: "text-muted",
  SKIPPED: "border-warn/30 bg-warn/5 text-warn",
  FAILED: "border-danger/30 bg-danger/5 text-danger",
};

export function ImportForm() {
  const [state, action] = useActionState<ImportState, FormData>(
    importSeedAction,
    {},
  );

  return (
    <div className="grid gap-8">
      <form action={action} className="card grid max-w-[640px] gap-5 p-6">
        {state.error ? <FormError message={state.error} /> : null}

        <Field
          label="Seed file"
          htmlFor="seed-file"
          hint="JSON or CSV. Up to 5 MB."
        >
          <input
            id="seed-file"
            name="file"
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="field h-auto py-2 file:mr-3 file:rounded-[6px] file:border-0 file:bg-subtle file:px-3 file:py-1.5 file:text-[13px]"
          />
        </Field>

        <Field
          label="Or paste the records"
          htmlFor="seed-text"
          hint="A JSON array, or CSV with a header row."
        >
          <textarea
            id="seed-text"
            name="text"
            rows={8}
            className="field h-auto py-2.5 font-mono text-[12.5px]"
            placeholder={'[{"seed_id": "1", "title": "…", "provider": "…"}]'}
          />
        </Field>

        <SubmitButton className="justify-self-start" pendingLabel="Importing…">
          Import as drafts
        </SubmitButton>
      </form>

      {state.parseErrors?.length ? (
        <section className="card max-w-[860px] p-5">
          <h2 className="text-[14px] font-medium">
            Rows we could not read ({state.parseErrors.length})
          </h2>
          <ul className="mt-3 grid gap-1 text-[13px] text-muted">
            {state.parseErrors.map((error) => (
              <li key={`${error.row}-${error.message}`}>
                Row {error.row}: {error.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {state.summary ? (
        <section>
          <div className="mb-4 flex flex-wrap gap-3">
            <Count label="Records" value={state.summary.total} />
            <Count label="Drafts created" value={state.summary.created} />
            <Count label="Already imported" value={state.summary.matched} />
            <Count label="Parked" value={state.summary.skipped} />
            <Count label="Failed" value={state.summary.failed} />
          </div>

          <p className="mb-4 max-w-[70ch] text-[13.5px] text-muted">
            Every imported record is <strong className="text-ink">pending
            review</strong> and not visible on the public site. Categories are
            suggestions until you confirm them, and any field the file did not
            contain is left unknown.{" "}
            <Link
              href="/admin/review"
              className="underline underline-offset-2 hover:text-ink"
            >
              Open the review queue
            </Link>
            .
          </p>

          <ul className="card divide-y divide-line overflow-hidden">
            {state.rows?.map((row, i) => (
              <li
                key={`${row.seedId ?? row.title}-${i}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3"
              >
                <span className={cn("pill", TONE[row.outcome])}>
                  {row.outcome.toLowerCase()}
                </span>
                <div className="min-w-0 flex-1">
                  {row.opportunityId ? (
                    <Link
                      href={`/admin/review/${row.opportunityId}`}
                      className="block max-w-[60ch] truncate text-[14px] font-medium underline-offset-2 hover:underline"
                    >
                      {row.title}
                    </Link>
                  ) : (
                    <span className="block max-w-[60ch] truncate text-[14px] font-medium">
                      {row.title}
                    </span>
                  )}
                  <p className="mt-0.5 text-[12px] text-muted">
                    {row.seedId ? `seed_id ${row.seedId} · ` : ""}
                    {row.message}
                  </p>
                </div>
                {row.duplicates > 0 ? (
                  <span className="pill pill-accent">
                    {row.duplicates} possible duplicate
                    {row.duplicates === 1 ? "" : "s"}
                  </span>
                ) : null}
                {row.missing > 0 ? (
                  <span className="text-[12px] text-muted tabular-nums">
                    {row.missing} field{row.missing === 1 ? "" : "s"} unknown
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-line px-4 py-2.5">
      <span className="block font-display text-[22px] leading-none font-medium tracking-[-0.03em] tabular-nums">
        {value}
      </span>
      <span className="mt-1 block text-[12px] text-muted">{label}</span>
    </div>
  );
}
