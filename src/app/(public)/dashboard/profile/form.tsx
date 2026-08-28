"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileState } from "@/app/actions/leads";
import { Field, Fieldset, FormError, FormNotice, Row } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

type Option = { id: string; name: string };

type LeadProfile = {
  startupName: string | null;
  website: string | null;
  linkedinUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  industryCategoryId: string | null;
  stageCategoryId: string | null;
  founderTypeCategoryId: string | null;
  yearFounded: number | null;
  teamSize: string | null;
  revenueRange: string | null;
  fundingRaised: string | null;
  fundingRequirementMin: string | null;
  fundingRequirementMax: string | null;
  dpiitStatus: boolean | null;
  udyamStatus: boolean | null;
};

const TEAM_SIZES = ["Just me", "2–5", "6–10", "11–25", "26–50", "50+"];
const REVENUE = [
  "Pre-revenue",
  "Under ₹10 lakh",
  "₹10 lakh – ₹1 crore",
  "₹1 – 10 crore",
  "Over ₹10 crore",
];
const RAISED = [
  "Bootstrapped",
  "Under ₹25 lakh",
  "₹25 lakh – ₹2 crore",
  "₹2 – 10 crore",
  "Over ₹10 crore",
];

const tri = (v: boolean | null) => (v === null ? "unknown" : v ? "yes" : "no");

export function ProfileForm({
  lead,
  industries,
  stages,
  founderTypes,
}: {
  lead: LeadProfile;
  industries: Option[];
  stages: Option[];
  founderTypes: Option[];
}) {
  const [state, action] = useActionState<ProfileState, FormData>(
    updateProfileAction,
    {},
  );

  return (
    <form action={action} className="grid gap-7">
      <FormError message={state.error} />
      {state.ok ? <FormNotice message="Saved. Your matches will reflect this." /> : null}

      <div className="grid gap-5">
        <Row>
          <Field label="Startup name" htmlFor="startupName">
            <input
              id="startupName"
              name="startupName"
              className="field"
              defaultValue={lead.startupName ?? ""}
            />
          </Field>
          <Field label="Website" htmlFor="website">
            <input
              id="website"
              name="website"
              className="field"
              defaultValue={lead.website ?? ""}
              placeholder="https://"
            />
          </Field>
        </Row>

        <Row>
          <Field
            label="Industry"
            htmlFor="industryCategoryId"
            hint="Drives which opportunities we surface first."
          >
            <select
              id="industryCategoryId"
              name="industryCategoryId"
              className="field"
              defaultValue={lead.industryCategoryId ?? ""}
            >
              <option value="">Not set</option>
              {industries.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Stage"
            htmlFor="stageCategoryId"
            hint="A startup sits in one stage at a time."
          >
            <select
              id="stageCategoryId"
              name="stageCategoryId"
              className="field"
              defaultValue={lead.stageCategoryId ?? ""}
            >
              <option value="">Not set</option>
              {stages.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>
        </Row>

        <Row cols={3}>
          <Field label="City" htmlFor="city">
            <input id="city" name="city" className="field" defaultValue={lead.city ?? ""} />
          </Field>
          <Field label="State" htmlFor="state">
            <input id="state" name="state" className="field" defaultValue={lead.state ?? ""} />
          </Field>
          <Field label="Country" htmlFor="country">
            <input
              id="country"
              name="country"
              className="field"
              defaultValue={lead.country ?? "India"}
            />
          </Field>
        </Row>
      </div>

      <Fieldset
        title="For better matching"
        description="Only fill in what applies. Several programmes filter on exactly these."
      >
        <Row cols={3}>
          <Field label="Year founded" htmlFor="yearFounded">
            <input
              id="yearFounded"
              name="yearFounded"
              inputMode="numeric"
              className="field"
              defaultValue={lead.yearFounded ?? ""}
            />
          </Field>
          <Field label="Team size" htmlFor="teamSize">
            <select
              id="teamSize"
              name="teamSize"
              className="field"
              defaultValue={lead.teamSize ?? ""}
            >
              <option value="">Not set</option>
              {TEAM_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Founder category" htmlFor="founderTypeCategoryId">
            <select
              id="founderTypeCategoryId"
              name="founderTypeCategoryId"
              className="field"
              defaultValue={lead.founderTypeCategoryId ?? ""}
            >
              <option value="">Not set</option>
              {founderTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Revenue" htmlFor="revenueRange">
            <select
              id="revenueRange"
              name="revenueRange"
              className="field"
              defaultValue={lead.revenueRange ?? ""}
            >
              <option value="">Not set</option>
              {REVENUE.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Funding raised so far" htmlFor="fundingRaised">
            <select
              id="fundingRaised"
              name="fundingRaised"
              className="field"
              defaultValue={lead.fundingRaised ?? ""}
            >
              <option value="">Not set</option>
              {RAISED.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Looking for at least (₹)" htmlFor="fundingRequirementMin">
            <input
              id="fundingRequirementMin"
              name="fundingRequirementMin"
              inputMode="numeric"
              className="field"
              defaultValue={lead.fundingRequirementMin ?? ""}
              placeholder="500000"
            />
          </Field>
          <Field label="Up to (₹)" htmlFor="fundingRequirementMax">
            <input
              id="fundingRequirementMax"
              name="fundingRequirementMax"
              inputMode="numeric"
              className="field"
              defaultValue={lead.fundingRequirementMax ?? ""}
              placeholder="10000000"
            />
          </Field>
        </Row>

        <Row>
          <Field label="DPIIT recognised" htmlFor="dpiitStatus">
            <select
              id="dpiitStatus"
              name="dpiitStatus"
              className="field"
              defaultValue={tri(lead.dpiitStatus)}
            >
              <option value="unknown">Not set</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
          <Field label="Udyam / MSME registered" htmlFor="udyamStatus">
            <select
              id="udyamStatus"
              name="udyamStatus"
              className="field"
              defaultValue={tri(lead.udyamStatus)}
            >
              <option value="unknown">Not set</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
        </Row>

        <Field label="Founder LinkedIn" htmlFor="linkedinUrl">
          <input
            id="linkedinUrl"
            name="linkedinUrl"
            className="field"
            defaultValue={lead.linkedinUrl ?? ""}
            placeholder="https://linkedin.com/in/…"
          />
        </Field>
      </Fieldset>

      <div className="border-t border-line pt-6">
        <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}
