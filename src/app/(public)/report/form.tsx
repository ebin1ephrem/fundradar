"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { submitReportAction, type ReportState } from "@/app/actions/report";
import { Field } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { reportError as reportCopy } from "@/content/copy";

export function ReportForm({ slug }: { slug: string }) {
  const [state, action] = useActionState<ReportState, FormData>(
    submitReportAction,
    {},
  );

  if (state.ok) {
    return (
      <div className="mt-8 rounded-[12px] border border-line bg-subtle p-6">
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full bg-accent text-ink"
        >
          <Check className="size-5" strokeWidth={2.4} />
        </span>
        <p className="mt-4 text-[16px] font-medium tracking-[-0.02em]">
          {reportCopy.confirmation}
        </p>
        <Link href="/opportunities" className="btn btn-secondary mt-5">
          Back to open opportunities
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 grid gap-5">
      <input type="hidden" name="slug" value={slug} />

      {state.error ? (
        <p className="text-[13px] text-danger">{state.error}</p>
      ) : null}

      <fieldset>
        <legend className="text-[13px] font-medium">What looks wrong?</legend>
        <div className="mt-3 grid gap-1.5">
          {reportCopy.reasons.map((reason, i) => (
            <label
              key={reason.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-[8px] border border-line px-3.5 py-2.5 text-[14px] transition-colors duration-200 hover:border-line-strong has-checked:border-ink has-checked:bg-subtle"
            >
              <input
                type="radio"
                name="reason"
                value={reason.value}
                defaultChecked={i === 0}
                className="size-3.5 accent-[var(--color-ink)]"
              />
              {reason.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label={reportCopy.detailsLabel}
        htmlFor="report-details"
        hint="Optional."
      >
        <textarea
          id="report-details"
          name="details"
          rows={4}
          maxLength={2000}
          className="field h-auto py-2.5"
          placeholder={reportCopy.detailsPlaceholder}
        />
      </Field>

      <Field
        label="Your email"
        htmlFor="report-email"
        hint="Optional — only used if we need to ask you something."
        error={state.fieldErrors?.email}
      >
        <input
          id="report-email"
          name="email"
          inputMode="email"
          autoComplete="email"
          className="field"
          placeholder="you@startup.com"
        />
      </Field>

      <SubmitButton className="justify-self-start" pendingLabel="Sending…">
        {reportCopy.cta}
      </SubmitButton>
    </form>
  );
}
