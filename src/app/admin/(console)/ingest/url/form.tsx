"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check } from "lucide-react";
import { ingestUrlAction, type IngestState } from "../actions";
import { Field } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const STAGES = [
  "Fetching the page",
  "Reading the content",
  "Extracting the opportunity",
  "Checking categories",
  "Checking for duplicates",
];

export function UrlForm() {
  const [state, action] = useActionState<IngestState, FormData>(ingestUrlAction, {});

  if (state.result) return <Result result={state.result} />;

  return (
    <form action={action} className="grid max-w-[720px] gap-6">
      {state.error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-warn/30 bg-warn/5 p-4"
        >
          <p className="flex items-start gap-2 text-[14px] text-warn">
            <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
            {state.error}
          </p>
          {state.offerPaste ? (
            <p className="mt-3 text-[13.5px] text-muted">
              Some pages need a sign-in, ask crawlers not to read them, or build
              their content in the browser. We do not go around any of that —
              open the page yourself and paste the text.
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn btn-secondary btn-sm">
              Try again
            </button>
            {state.offerPaste ? (
              <Link href="/admin/ingest/paste" className="btn btn-primary btn-sm">
                Paste the text instead
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <Field
        label="Opportunity URL"
        htmlFor="url"
        required
        hint="The provider's own page for this programme."
      >
        <input
          id="url"
          name="url"
          className="field"
          required
          placeholder="https://provider.org/programmes/climate-challenge"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <FetchButton />
        <Link href="/admin/opportunities/new" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FetchButton() {
  const { pending } = useFormStatus();

  return (
    <>
      <button type="submit" disabled={pending} className="btn btn-accent">
        {pending ? "Working…" : "Read this page"}
      </button>
      {pending ? (
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
          {STAGES.map((stage) => (
            <li key={stage} className="flex items-center gap-1.5">
              <span className="size-1 rounded-full bg-line-strong" />
              {stage}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function Result({ result }: { result: NonNullable<IngestState["result"]> }) {
  const created = result.outcome === "DRAFT_CREATED";

  return (
    <div className="max-w-[720px] rounded-[12px] border border-line bg-subtle p-6">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
            created ? "bg-accent text-ink" : "bg-warn/15 text-warn",
          )}
        >
          {created ? <Check className="size-4" strokeWidth={2.6} /> : "?"}
        </span>
        <div>
          <h2 className="text-[19px] font-medium tracking-[-0.025em]">
            {created ? "Draft created" : "Saved for review"}
          </h2>
          <p className="mt-1.5 text-[14px] text-muted">{result.message}</p>
        </div>
      </div>

      {result.missingFields.length ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-[13px] font-medium">Information we could not confirm</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {result.missingFields.map((field) => (
              <span key={field.field} className="pill">
                {field.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {result.opportunityId ? (
          <Link href={`/admin/review/${result.opportunityId}`} className="btn btn-primary">
            Review draft
          </Link>
        ) : (
          <Link href="/admin/inbox" className="btn btn-primary">
            Open the collection inbox
          </Link>
        )}
        <Link href="/admin/ingest/url" className="btn btn-secondary">
          Add another
        </Link>
      </div>
    </div>
  );
}
