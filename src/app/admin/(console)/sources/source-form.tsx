"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Source } from "@prisma/client";
import { CheckFrequency, SourceCrawlType, SourceType } from "@prisma/client";
import { Field, Fieldset, FormError, Row } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveSourceAction, type SourceState } from "./actions";
import { cn } from "@/lib/utils";

const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  GOVERNMENT: "Government",
  UNIVERSITY: "University",
  INCUBATOR: "Incubator",
  ACCELERATOR: "Accelerator",
  CORPORATE: "Corporate",
  FOUNDATION: "Foundation",
  COMPETITION_PORTAL: "Competition platform",
  FUNDING_AGENCY: "Funding agency",
  INTERNATIONAL_ORGANISATION: "International organisation",
  INVESTOR: "Investor",
  OTHER: "Other",
};

const FREQUENCY_LABEL: Record<CheckFrequency, string> = {
  DAILY: "Every day",
  EVERY_3_DAYS: "Every three days",
  WEEKLY: "Every week",
  FORTNIGHTLY: "Every two weeks",
  MONTHLY: "Every month",
  MANUAL: "Only when I ask",
};

const CRAWL_TYPES: { value: SourceCrawlType; title: string; body: string }[] = [
  {
    value: "SINGLE_PAGE",
    title: "One page",
    body: "A single programme page. We watch it for changes.",
  },
  {
    value: "LISTING_PAGE",
    title: "A listing page",
    body: "A page that links to programmes. We follow the links that look relevant.",
  },
  {
    value: "DOMAIN",
    title: "A section of a site",
    body: "We look for programme pages under the paths you allow, one level deeper.",
  },
];

export function SourceForm({ source }: { source?: Source }) {
  const [state, action] = useActionState<SourceState, FormData>(saveSourceAction, {});
  const [crawlType, setCrawlType] = useState<SourceCrawlType>(
    source?.crawlType ?? "SINGLE_PAGE",
  );
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid max-w-[820px] gap-7">
      {source ? <input type="hidden" name="id" value={source.id} /> : null}
      <FormError message={state.error} />

      <div className="grid gap-5">
        <Row>
          <Field label="Source name" htmlFor="name" required error={err.name}>
            <input
              id="name"
              name="name"
              className="field"
              required
              defaultValue={source?.name ?? ""}
              placeholder="Department of Science & Technology — schemes"
            />
          </Field>
          <Field label="Organisation" htmlFor="organisation">
            <input
              id="organisation"
              name="organisation"
              className="field"
              defaultValue={source?.organisation ?? ""}
            />
          </Field>
        </Row>

        <Field
          label="URL to monitor"
          htmlFor="url"
          required
          error={err.url}
          hint="The page we start from."
        >
          <input
            id="url"
            name="url"
            className="field"
            required
            defaultValue={source?.url ?? ""}
            placeholder="https://agency.gov.in/schemes"
          />
        </Field>

        <Row cols={3}>
          <Field label="Source type" htmlFor="sourceType">
            <select
              id="sourceType"
              name="sourceType"
              className="field"
              defaultValue={source?.sourceType ?? "OTHER"}
            >
              {Object.entries(SOURCE_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Country" htmlFor="country">
            <input
              id="country"
              name="country"
              className="field"
              defaultValue={source?.country ?? "India"}
            />
          </Field>
          <Field label="State" htmlFor="state" hint="Optional.">
            <input id="state" name="state" className="field" defaultValue={source?.state ?? ""} />
          </Field>
        </Row>
      </div>

      <Fieldset title="How to read it" description="What we do when we visit.">
        <div className="grid gap-2 sm:grid-cols-3">
          {CRAWL_TYPES.map((option) => (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-[10px] border p-4 transition-colors duration-200",
                crawlType === option.value
                  ? "border-ink bg-subtle"
                  : "border-line hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name="crawlType"
                value={option.value}
                checked={crawlType === option.value}
                onChange={() => setCrawlType(option.value)}
                className="sr-only"
              />
              <span className="block text-[13.5px] font-medium">{option.title}</span>
              <span className="mt-1 block text-[12.5px] leading-relaxed text-muted">
                {option.body}
              </span>
            </label>
          ))}
        </div>

        <Row>
          <Field label="How often" htmlFor="checkFrequency">
            <select
              id="checkFrequency"
              name="checkFrequency"
              className="field"
              defaultValue={source?.checkFrequency ?? "WEEKLY"}
            >
              {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Pages per run"
            htmlFor="maxPages"
            hint="A ceiling, so one run stays polite."
          >
            <input
              id="maxPages"
              name="maxPages"
              type="number"
              min={1}
              max={200}
              className="field"
              defaultValue={source?.maxPages ?? 40}
            />
          </Field>
        </Row>

        {crawlType !== "SINGLE_PAGE" ? (
          <Row>
            <Field
              label="Only these paths"
              htmlFor="allowPaths"
              hint="One per line, e.g. /schemes/. Leave empty to allow any path."
            >
              <textarea
                id="allowPaths"
                name="allowPaths"
                rows={3}
                className="field font-mono text-[13px]"
                defaultValue={source?.allowPaths.join("\n") ?? ""}
                placeholder={"/grants/\n/programmes/\n/funding/"}
              />
            </Field>
            <Field
              label="Never these paths"
              htmlFor="ignorePaths"
              hint="One per line."
            >
              <textarea
                id="ignorePaths"
                name="ignorePaths"
                rows={3}
                className="field font-mono text-[13px]"
                defaultValue={source?.ignorePaths.join("\n") ?? ""}
                placeholder={"/news/\n/careers/"}
              />
            </Field>
          </Row>
        ) : null}
      </Fieldset>

      <Fieldset
        title="Automation"
        description="Collection and extraction can run on their own. Publishing cannot — that is not a setting."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle
            name="enabled"
            label="Monitor this source"
            description="Turn off to pause it without deleting anything."
            defaultChecked={source?.enabled ?? true}
          />
          <Toggle
            name="autoCollect"
            label="Collect automatically"
            description="Visit on the schedule above."
            defaultChecked={source?.autoCollect ?? true}
          />
          <Toggle
            name="autoExtract"
            label="Extract automatically"
            description="Turn collected pages into structured drafts."
            defaultChecked={source?.autoExtract ?? true}
          />
          <Toggle
            name="autoCreateReviewItems"
            label="Queue for review automatically"
            description="Put new drafts straight into the review queue."
            defaultChecked={source?.autoCreateReviewItems ?? true}
          />
        </div>

        <div className="rounded-[10px] border border-line bg-subtle px-4 py-3">
          <p className="text-[13px] font-medium">Publish automatically</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            There is no such setting, by design. Everything this source finds
            waits for a person.
          </p>
        </div>
      </Fieldset>

      <Field label="Notes" htmlFor="notes" hint="Anything the next person should know.">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="field"
          defaultValue={source?.notes ?? ""}
        />
      </Field>

      <div className="flex items-center gap-3 border-t border-line pt-6">
        <SubmitButton pendingLabel="Saving…">
          {source ? "Save source" : "Add source"}
        </SubmitButton>
        <Link href="/admin/sources" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-line p-3.5 transition-colors duration-200 hover:border-line-strong has-checked:border-ink">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 accent-ink"
      />
      <span>
        <span className="block text-[13.5px] font-medium">{label}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">
          {description}
        </span>
      </span>
    </label>
  );
}
