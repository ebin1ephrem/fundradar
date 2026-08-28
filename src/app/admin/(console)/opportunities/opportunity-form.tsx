"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { OpportunityFormValues } from "@/lib/admin/opportunity-form-values";
import { Field, Fieldset, FormError, Row } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  CategoryPicker,
  type PickerCategory,
} from "@/components/admin/category-picker";
import {
  BENEFIT_FIELDS,
  FUNDING_TYPE_LABEL,
  GEOGRAPHY_SCOPE_LABEL,
  PROVIDER_SECTOR_LABEL,
} from "@/lib/validation/opportunity";
import { slugify, cn } from "@/lib/utils";
import type { OpportunityFormState } from "./actions";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "SGD", "AED", "AUD", "CHF", "JPY"];

export function OpportunityForm({
  action,
  opportunity,
  categories,
  selectedCategoryIds,
  primaryCategoryId,
}: {
  action: (
    state: OpportunityFormState,
    formData: FormData,
  ) => Promise<OpportunityFormState>;
  opportunity?: OpportunityFormValues;
  categories: PickerCategory[];
  selectedCategoryIds: string[];
  primaryCategoryId: string | null;
}) {
  const [state, formAction] = useActionState<OpportunityFormState, FormData>(
    action,
    {},
  );
  const [title, setTitle] = useState(opportunity?.title ?? "");
  const [slug, setSlug] = useState(opportunity?.slug ?? "");
  const [rolling, setRolling] = useState(opportunity?.isRollingDeadline ?? false);
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid max-w-[900px] gap-8 pb-4">
      {opportunity ? <input type="hidden" name="id" value={opportunity.id} /> : null}
      <FormError message={state.error} />

      <div className="grid gap-5">
        <Field label="Opportunity title" htmlFor="title" required error={err.title}>
          <input
            id="title"
            name="title"
            className="field"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!opportunity) setSlug(slugify(e.target.value));
            }}
            placeholder="Climate Innovation Challenge 2026"
          />
        </Field>

        <Row>
          <Field
            label="Provider / organisation"
            htmlFor="providerName"
            required
            error={err.providerName}
          >
            <input
              id="providerName"
              name="providerName"
              className="field"
              required
              defaultValue={opportunity?.providerName ?? ""}
              placeholder="Department of Science & Technology"
            />
          </Field>
          <Field label="Programme name" htmlFor="programmeName" hint="If it differs from the title.">
            <input
              id="programmeName"
              name="programmeName"
              className="field"
              defaultValue={opportunity?.programmeName ?? ""}
            />
          </Field>
        </Row>

        <Row>
          <Field
            label="URL slug"
            htmlFor="slug"
            error={err.slug}
            hint={`/opportunities/${slug || "…"}`}
          >
            <input
              id="slug"
              name="slug"
              className="field"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </Field>
          <Field label="Provider type" htmlFor="providerSector">
            <select
              id="providerSector"
              name="providerSector"
              className="field"
              defaultValue={opportunity?.providerSector ?? ""}
            >
              <option value="">Not specified</option>
              {Object.entries(PROVIDER_SECTOR_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </Row>

        <Field
          label="Short description"
          htmlFor="shortDescription"
          required
          error={err.shortDescription}
          hint="Shown on cards and in search results. Always public — never behind the lead gate."
        >
          <textarea
            id="shortDescription"
            name="shortDescription"
            className="field"
            rows={3}
            required
            maxLength={400}
            defaultValue={opportunity?.shortDescription ?? ""}
          />
        </Field>

        <Field
          label="Full description"
          htmlFor="fullDescription"
          hint="The detailed write-up shown on the opportunity page."
        >
          <textarea
            id="fullDescription"
            name="fullDescription"
            className="field"
            rows={7}
            defaultValue={opportunity?.fullDescription ?? ""}
          />
        </Field>

        <Field
          label="Provider logo URL"
          htmlFor="providerLogoUrl"
          error={err.providerLogoUrl}
        >
          <input
            id="providerLogoUrl"
            name="providerLogoUrl"
            className="field"
            defaultValue={opportunity?.providerLogoUrl ?? ""}
            placeholder="https://…"
          />
        </Field>
      </div>

      <Fieldset
        title="Categories"
        description="Multi-select across every dimension. One opportunity can sit in several at once."
      >
        <CategoryPicker
          categories={categories}
          defaultSelected={selectedCategoryIds}
          defaultPrimary={primaryCategoryId}
        />
      </Fieldset>

      <Fieldset title="Funding">
        <Row cols={3}>
          <Field label="Minimum funding" htmlFor="fundingMin" error={err.fundingMin}>
            <input
              id="fundingMin"
              name="fundingMin"
              inputMode="numeric"
              className="field"
              defaultValue={opportunity?.fundingMin ?? ""}
              placeholder="500000"
            />
          </Field>
          <Field label="Maximum funding" htmlFor="fundingMax" error={err.fundingMax}>
            <input
              id="fundingMax"
              name="fundingMax"
              inputMode="numeric"
              className="field"
              defaultValue={opportunity?.fundingMax ?? ""}
              placeholder="5000000"
            />
          </Field>
          <Field label="Currency" htmlFor="currency">
            <select
              id="currency"
              name="currency"
              className="field"
              defaultValue={opportunity?.currency ?? "INR"}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </Row>

        <Field
          label="Funding as the provider words it"
          htmlFor="fundingAmountText"
          hint='Use when there is no clean number — e.g. "Up to 50% of project cost".'
        >
          <input
            id="fundingAmountText"
            name="fundingAmountText"
            className="field"
            defaultValue={opportunity?.fundingAmountText ?? ""}
          />
        </Field>

        <TriState
          name="isEquityFree"
          label="Equity-free"
          defaultValue={opportunity?.isEquityFree ?? "unknown"}
        />

        <Field label="Funding types" hint="Tick everything that applies.">
          <div className="grid gap-1.5 sm:grid-cols-3">
            {Object.entries(FUNDING_TYPE_LABEL).map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-[7px] border border-line px-2.5 py-2 text-[13px] transition-colors duration-200 hover:border-line-strong has-checked:border-ink has-checked:bg-subtle"
              >
                <input
                  type="checkbox"
                  name="fundingTypes"
                  value={value}
                  defaultChecked={opportunity?.fundingTypes?.includes(
                    value as never,
                  )}
                  className="size-3.5 accent-ink"
                />
                {label}
              </label>
            ))}
          </div>
        </Field>
      </Fieldset>

      <Fieldset title="Dates">
        <Row>
          <Field
            label="Application deadline"
            htmlFor="applicationDeadline"
            error={err.applicationDeadline}
          >
            <input
              id="applicationDeadline"
              name="applicationDeadline"
              type="date"
              className="field"
              disabled={rolling}
              defaultValue={opportunity?.applicationDeadline ?? ""}
            />
          </Field>
          <Field label="Rolling deadline">
            <label className="flex h-12 cursor-pointer items-center gap-2.5 rounded-[8px] border border-line px-3.5 text-[13.5px] transition-colors duration-200 has-checked:border-ink has-checked:bg-subtle">
              <input
                type="checkbox"
                name="isRollingDeadline"
                checked={rolling}
                onChange={(e) => setRolling(e.target.checked)}
                className="size-4 accent-ink"
              />
              Applications accepted on a rolling basis
            </label>
          </Field>
        </Row>

        <Row cols={3}>
          <Field
            label="Applications open"
            htmlFor="applicationOpenDate"
            error={err.applicationOpenDate}
          >
            <input
              id="applicationOpenDate"
              name="applicationOpenDate"
              type="date"
              className="field"
              defaultValue={opportunity?.applicationOpenDate ?? ""}
            />
          </Field>
          <Field label="Programme starts" htmlFor="programmeStartDate">
            <input
              id="programmeStartDate"
              name="programmeStartDate"
              type="date"
              className="field"
              defaultValue={opportunity?.programmeStartDate ?? ""}
            />
          </Field>
          <Field label="Programme ends" htmlFor="programmeEndDate">
            <input
              id="programmeEndDate"
              name="programmeEndDate"
              type="date"
              className="field"
              defaultValue={opportunity?.programmeEndDate ?? ""}
            />
          </Field>
        </Row>
      </Fieldset>

      <Fieldset
        title="Eligibility"
        description="Record only what the provider actually states. Leave a field empty rather than guessing."
      >
        <Field label="Eligibility summary" htmlFor="eligibilitySummary">
          <textarea
            id="eligibilitySummary"
            name="eligibilitySummary"
            className="field"
            rows={5}
            defaultValue={opportunity?.eligibilitySummary ?? ""}
          />
        </Field>

        <Row cols={4}>
          <Field label="Scope" htmlFor="geographyScope">
            <select
              id="geographyScope"
              name="geographyScope"
              className="field"
              defaultValue={opportunity?.geographyScope ?? "PAN_INDIA"}
            >
              {Object.entries(GEOGRAPHY_SCOPE_LABEL).map(([value, label]) => (
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
              defaultValue={opportunity?.country ?? "India"}
            />
          </Field>
          <Field label="State" htmlFor="state">
            <input
              id="state"
              name="state"
              className="field"
              defaultValue={opportunity?.state ?? ""}
              placeholder="Kerala"
            />
          </Field>
          <Field label="City" htmlFor="city">
            <input
              id="city"
              name="city"
              className="field"
              defaultValue={opportunity?.city ?? ""}
            />
          </Field>
        </Row>

        <Row>
          <Field
            label="Minimum company age (months)"
            htmlFor="incorporationAgeMinMonths"
            error={err.incorporationAgeMinMonths}
          >
            <input
              id="incorporationAgeMinMonths"
              name="incorporationAgeMinMonths"
              inputMode="numeric"
              className="field"
              defaultValue={opportunity?.incorporationAgeMinMonths ?? ""}
            />
          </Field>
          <Field
            label="Maximum company age (months)"
            htmlFor="incorporationAgeMaxMonths"
            error={err.incorporationAgeMaxMonths}
          >
            <input
              id="incorporationAgeMaxMonths"
              name="incorporationAgeMaxMonths"
              inputMode="numeric"
              className="field"
              defaultValue={opportunity?.incorporationAgeMaxMonths ?? ""}
            />
          </Field>
        </Row>

        <Row>
          <Field
            label="Company types"
            htmlFor="companyTypes"
            hint="Comma separated, e.g. Private Limited, LLP"
          >
            <input
              id="companyTypes"
              name="companyTypes"
              className="field"
              defaultValue={opportunity?.companyTypes ?? ""}
            />
          </Field>
          <Field
            label="Technologies"
            htmlFor="technologies"
            hint="Comma separated. Feeds search."
          >
            <input
              id="technologies"
              name="technologies"
              className="field"
              defaultValue={opportunity?.technologies ?? ""}
            />
          </Field>
        </Row>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <TriState
            name="requiresDpiit"
            label="DPIIT recognition required"
            defaultValue={opportunity?.requiresDpiit ?? "unknown"}
          />
          <TriState
            name="requiresMsmeUdyam"
            label="MSME / Udyam registration required"
            defaultValue={opportunity?.requiresMsmeUdyam ?? "unknown"}
          />
          <TriState
            name="requiresStudentFounder"
            label="Student founder required"
            defaultValue={opportunity?.requiresStudentFounder ?? "unknown"}
          />
          <TriState
            name="requiresWomenFounder"
            label="Women founder required"
            defaultValue={opportunity?.requiresWomenFounder ?? "unknown"}
          />
        </div>

        <Row>
          <Field label="Founder requirements" htmlFor="founderRequirements">
            <textarea
              id="founderRequirements"
              name="founderRequirements"
              className="field"
              rows={3}
              defaultValue={opportunity?.founderRequirements ?? ""}
            />
          </Field>
          <Field label="Registration requirements" htmlFor="registrationRequirements">
            <textarea
              id="registrationRequirements"
              name="registrationRequirements"
              className="field"
              rows={3}
              defaultValue={opportunity?.registrationRequirements ?? ""}
            />
          </Field>
        </Row>

        <Row>
          <Field label="Revenue requirements" htmlFor="revenueRequirement">
            <textarea
              id="revenueRequirement"
              name="revenueRequirement"
              className="field"
              rows={3}
              defaultValue={opportunity?.revenueRequirement ?? ""}
            />
          </Field>
          <Field label="Limits on funding already raised" htmlFor="previousFundingLimit">
            <textarea
              id="previousFundingLimit"
              name="previousFundingLimit"
              className="field"
              rows={3}
              defaultValue={opportunity?.previousFundingLimit ?? ""}
            />
          </Field>
        </Row>

        <Field label="Other eligibility criteria" htmlFor="otherEligibility">
          <textarea
            id="otherEligibility"
            name="otherEligibility"
            className="field"
            rows={3}
            defaultValue={opportunity?.otherEligibility ?? ""}
          />
        </Field>
      </Fieldset>

      <Fieldset title="Programme benefits">
        <Field label="What the programme offers" htmlFor="benefitsSummary">
          <textarea
            id="benefitsSummary"
            name="benefitsSummary"
            className="field"
            rows={4}
            defaultValue={opportunity?.benefitsSummary ?? ""}
          />
        </Field>

        <div className="grid gap-1.5 sm:grid-cols-4">
          {BENEFIT_FIELDS.map((benefit) => (
            <label
              key={benefit.name}
              className="flex cursor-pointer items-center gap-2 rounded-[7px] border border-line px-2.5 py-2 text-[13px] transition-colors duration-200 hover:border-line-strong has-checked:border-ink has-checked:bg-subtle"
            >
              <input
                type="checkbox"
                name={benefit.name}
                defaultChecked={opportunity?.benefits[benefit.name] ?? false}
                className="size-3.5 accent-ink"
              />
              {benefit.label}
            </label>
          ))}
        </div>
      </Fieldset>

      <Fieldset title="Applying">
        <Row>
          <Field
            label="Application URL"
            htmlFor="applicationUrl"
            error={err.applicationUrl}
          >
            <input
              id="applicationUrl"
              name="applicationUrl"
              className="field"
              defaultValue={opportunity?.applicationUrl ?? ""}
              placeholder="https://…"
            />
          </Field>
          <Field label="Contact email" htmlFor="contactEmail" error={err.contactEmail}>
            {/*
              Deliberately not type="email". The browser silently refuses to
              submit an invalid value, which locked admins out of saving a draft
              whenever extraction produced a malformed address. The schema
              validates it and shows a message they can act on.
            */}
            <input
              id="contactEmail"
              name="contactEmail"
              inputMode="email"
              className="field"
              defaultValue={opportunity?.contactEmail ?? ""}
            />
          </Field>
        </Row>

        <Field
          label="Application instructions"
          htmlFor="applicationInstructions"
          hint="Required if there is no application URL."
        >
          <textarea
            id="applicationInstructions"
            name="applicationInstructions"
            className="field"
            rows={3}
            defaultValue={opportunity?.applicationInstructions ?? ""}
          />
        </Field>

        <Field label="Application process" htmlFor="applicationProcess">
          <textarea
            id="applicationProcess"
            name="applicationProcess"
            className="field"
            rows={4}
            defaultValue={opportunity?.applicationProcess ?? ""}
          />
        </Field>

        <Row>
          <Field label="Required documents" htmlFor="requiredDocuments">
            <textarea
              id="requiredDocuments"
              name="requiredDocuments"
              className="field"
              rows={4}
              defaultValue={opportunity?.requiredDocuments ?? ""}
            />
          </Field>
          <Field label="Selection process" htmlFor="selectionProcess">
            <textarea
              id="selectionProcess"
              name="selectionProcess"
              className="field"
              rows={4}
              defaultValue={opportunity?.selectionProcess ?? ""}
            />
          </Field>
        </Row>

        <Field label="Important notes" htmlFor="importantNotes">
          <textarea
            id="importantNotes"
            name="importantNotes"
            className="field"
            rows={3}
            defaultValue={opportunity?.importantNotes ?? ""}
          />
        </Field>
      </Fieldset>

      <Fieldset
        title="Source"
        description="Every published opportunity must point at the page it came from."
      >
        <Field
          label="Official source URL"
          htmlFor="officialSourceUrl"
          error={err.officialSourceUrl}
          hint="The provider's own page. A draft can be saved without it; publishing cannot."
        >
          <input
            id="officialSourceUrl"
            name="officialSourceUrl"
            className="field"
            defaultValue={opportunity?.officialSourceUrl ?? ""}
            placeholder="https://…"
          />
        </Field>
      </Fieldset>

      <Fieldset title="Search engine listing" description="Optional overrides.">
        <Field label="SEO title" htmlFor="seoTitle">
          <input
            id="seoTitle"
            name="seoTitle"
            className="field"
            defaultValue={opportunity?.seoTitle ?? ""}
          />
        </Field>
        <Field label="SEO description" htmlFor="seoDescription">
          <textarea
            id="seoDescription"
            name="seoDescription"
            className="field"
            rows={2}
            defaultValue={opportunity?.seoDescription ?? ""}
          />
        </Field>
      </Fieldset>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-line bg-canvas/95 px-1 py-4 backdrop-blur">
        <SubmitButton name="intent" value="draft" pendingLabel="Saving…">
          Save as draft
        </SubmitButton>
        <SubmitButton
          name="intent"
          value="publish"
          variant="accent"
          pendingLabel="Publishing…"
        >
          Save &amp; publish
        </SubmitButton>
        <Link href="/admin/opportunities" className="btn btn-ghost">
          Cancel
        </Link>
        <p className="hint ml-auto max-w-[36ch]">
          Publishing runs the required-field check first.
        </p>
      </div>
    </form>
  );
}

/** Yes / No / provider does not say — never a silent false. */
function TriState({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const options = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "unknown", label: "Not stated" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-line px-3.5 py-2.5">
      <span className="text-[13.5px]">{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "cursor-pointer rounded-[6px] border px-2.5 py-1 text-[12.5px] transition-colors duration-200",
              value === option.value
                ? "border-ink bg-ink text-white"
                : "border-line text-muted hover:border-line-strong",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => setValue(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}
