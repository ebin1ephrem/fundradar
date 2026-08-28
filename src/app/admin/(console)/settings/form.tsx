"use client";

import { useActionState } from "react";
import {
  GATEABLE_SECTIONS,
  type GateableSection,
  type LeadGateSettings,
} from "@/lib/settings-schema";
import { Field, FormError, FormNotice } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateGateSettingsAction, type SettingsState } from "./actions";

export function GateSettingsForm({
  gate,
  gatedSections,
}: {
  gate: LeadGateSettings;
  gatedSections: GateableSection[];
}) {
  const [state, action] = useActionState<SettingsState, FormData>(
    updateGateSettingsAction,
    {},
  );
  const gated = new Set<string>(gatedSections);

  return (
    <form action={action} className="grid max-w-[680px] gap-7">
      <FormError message={state.error} />
      {state.ok ? <FormNotice message="Saved. The public site reflects this now." /> : null}

      <section>
        <h2 className="text-[17px] font-medium tracking-[-0.02em]">Lead capture</h2>
        <p className="hint mt-1 mb-4">
          Browsing, searching and filtering are always open to everyone. This
          only controls the deeper detail on an opportunity page.
        </p>

        <div className="grid gap-2.5">
          <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-line p-4 transition-colors duration-200 hover:border-line-strong has-checked:border-ink">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={gate.enabled}
              className="mt-0.5 size-4 accent-ink"
            />
            <span>
              <span className="block text-[14.5px] font-medium">
                Ask visitors for their details
              </span>
              <span className="mt-0.5 block text-[13px] text-muted">
                Turn this off and every section is public to everyone.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-line p-4 transition-colors duration-200 hover:border-line-strong has-checked:border-ink">
            <input
              type="checkbox"
              name="promptOnUnlockAction"
              defaultChecked={gate.promptOnUnlockAction}
              className="mt-0.5 size-4 accent-ink"
            />
            <span>
              <span className="block text-[14.5px] font-medium">
                Prompt when they click a locked action
              </span>
              <span className="mt-0.5 block text-[13px] text-muted">
                Saving, reminders and unlocking a section.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-4 max-w-[280px]">
          <Field
            label="Also prompt after this many opportunity views"
            htmlFor="views"
            hint="Never on arrival — the platform has to be useful first."
          >
            <input
              id="views"
              name="views"
              type="number"
              min={1}
              max={20}
              className="field"
              defaultValue={gate.opportunityViewsBeforePrompt}
            />
          </Field>
        </div>
      </section>

      <section className="border-t border-line pt-7">
        <h2 className="text-[17px] font-medium tracking-[-0.02em]">
          Which sections need details
        </h2>
        <p className="hint mt-1 mb-4">
          Anything unticked stays public. Title, provider, summary, categories,
          funding range, deadline, location and stage are always public.
        </p>

        <div className="grid gap-1.5 sm:grid-cols-2">
          {GATEABLE_SECTIONS.map((section) => (
            <label
              key={section.key}
              className="flex cursor-pointer items-center gap-2.5 rounded-[8px] border border-line px-3 py-2.5 text-[13.5px] transition-colors duration-200 hover:border-line-strong has-checked:border-ink has-checked:bg-subtle"
            >
              <input
                type="checkbox"
                name="sections"
                value={section.key}
                defaultChecked={gated.has(section.key)}
                className="size-4 accent-ink"
              />
              {section.label}
            </label>
          ))}
        </div>
      </section>

      <div className="border-t border-line pt-6">
        <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
      </div>
    </form>
  );
}
