"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check } from "lucide-react";
import { pasteTextAction, type IngestState } from "../actions";
import { Field, FormError } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "a forwarded email",
  "a WhatsApp message",
  "a LinkedIn post",
  "a newsletter announcement",
  "text copied out of a PDF",
  "your own rough notes",
];

export function PasteForm({ hasAi }: { hasAi: boolean }) {
  const [state, action] = useActionState<IngestState, FormData>(pasteTextAction, {});

  if (state.result) return <Result result={state.result} />;

  return (
    <form action={action} className="grid max-w-[820px] gap-6">
      <FormError message={state.error} />

      <Field
        label="Opportunity information"
        htmlFor="text"
        required
        hint={`Works with ${EXAMPLES.join(", ")}. It does not need to be tidy.`}
      >
        <textarea
          id="text"
          name="text"
          required
          rows={16}
          className="field font-mono text-[13.5px] leading-relaxed"
          placeholder="Paste opportunity information here…"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Source URL"
          htmlFor="sourceUrl"
          hint="Optional. If you have the official page, it saves a step later."
        >
          <input id="sourceUrl" name="sourceUrl" className="field" placeholder="https://…" />
        </Field>
        <Field
          label="Source or organisation"
          htmlFor="sourceName"
          hint="Optional. Who runs this, if the text does not say clearly."
        >
          <input
            id="sourceName"
            name="sourceName"
            className="field"
            placeholder="ABC Foundation"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <CreateButton hasAi={hasAi} />
        <Link href="/admin/opportunities/new" className="btn btn-ghost">
          Cancel
        </Link>
        <p className="hint ml-auto max-w-[42ch]">
          This creates a draft for review. Nothing is published.
        </p>
      </div>
    </form>
  );
}

/**
 * Real stages, not a fake percentage. The steps are the pipeline's actual
 * steps, so the wording matches what is happening.
 */
function CreateButton({ hasAi }: { hasAi: boolean }) {
  const { pending } = useFormStatus();

  return (
    <>
      <button type="submit" disabled={pending} className="btn btn-accent">
        {pending ? "Working…" : "Create draft with AI"}
      </button>
      {pending ? (
        <span className="flex items-center gap-2 text-[13px] text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          Reading the text, extracting fields, checking categories and duplicates
        </span>
      ) : hasAi ? null : (
        <span className="text-[13px] text-muted">
          No AI provider configured — pattern matching only.
        </span>
      )}
    </>
  );
}

function Result({ result }: { result: NonNullable<IngestState["result"]> }) {
  const created = result.outcome === "DRAFT_CREATED";

  return (
    <div className="max-w-[720px]">
      <div
        className={cn(
          "rounded-[12px] border p-6",
          created ? "border-line bg-subtle" : "border-warn/30 bg-warn/5",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
              created ? "bg-accent text-ink" : "bg-warn/15 text-warn",
            )}
          >
            {created ? (
              <Check className="size-4" strokeWidth={2.6} />
            ) : (
              <AlertCircle className="size-4" strokeWidth={2} />
            )}
          </span>
          <div>
            <h2 className="text-[19px] font-medium tracking-[-0.025em]">
              {created ? "Draft created" : "Saved for review"}
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{result.message}</p>
          </div>
        </div>

        {result.missingFields.length ? (
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[13px] font-medium">Information we could not confirm</p>
            <p className="hint mt-1">
              Left blank rather than guessed. Fill anything in you know.
            </p>
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
          <Link href="/admin/ingest/paste" className="btn btn-secondary">
            Paste another
          </Link>
        </div>
      </div>
    </div>
  );
}
