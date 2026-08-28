"use client";

import { useActionState } from "react";
import { CheckFrequency, SourceCrawlType, SourceType } from "@prisma/client";
import { Field, FormError } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { bulkAddSourcesAction, type SourceState } from "./actions";

export function BulkAddForm() {
  const [state, action] = useActionState<SourceState, FormData>(bulkAddSourcesAction, {});

  return (
    <form action={action} className="card grid gap-4 p-5">
      <FormError message={state.error} />

      <Field
        label="URLs"
        htmlFor="urls"
        hint="One per line. Each becomes its own monitored source, named after its host."
      >
        <textarea
          id="urls"
          name="urls"
          rows={5}
          className="field font-mono text-[13px]"
          placeholder={"https://agency.gov.in/schemes\nhttps://university.edu/incubation"}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" htmlFor="bulkSourceType">
          <select id="bulkSourceType" name="sourceType" className="field" defaultValue="OTHER">
            {Object.values(SourceType).map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ").toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label="How to read" htmlFor="bulkCrawlType">
          <select
            id="bulkCrawlType"
            name="crawlType"
            className="field"
            defaultValue="LISTING_PAGE"
          >
            {Object.values(SourceCrawlType).map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ").toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label="How often" htmlFor="bulkFrequency">
          <select
            id="bulkFrequency"
            name="checkFrequency"
            className="field"
            defaultValue="WEEKLY"
          >
            {Object.values(CheckFrequency).map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ").toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <SubmitButton variant="secondary" pendingLabel="Adding…">
          Add sources
        </SubmitButton>
      </div>
    </form>
  );
}
