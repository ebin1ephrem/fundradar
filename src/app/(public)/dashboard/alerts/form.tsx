"use client";

import { useActionState, useState } from "react";
import type { CategoryType } from "@prisma/client";
import { updateAlertsAction, type AlertsState } from "@/app/actions/leads";
import { FormError, FormNotice } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; categoryType: CategoryType };

export function AlertsForm({
  categories,
  selectedCategoryIds,
  weekly,
  reminders,
  whatsappAlerts,
  emailConsent,
  whatsappConsent,
  hasWhatsapp,
}: {
  categories: Category[];
  selectedCategoryIds: string[];
  weekly: boolean;
  reminders: boolean;
  whatsappAlerts: boolean;
  emailConsent: boolean;
  whatsappConsent: boolean;
  hasWhatsapp: boolean;
}) {
  const [state, action] = useActionState<AlertsState, FormData>(
    updateAlertsAction,
    {},
  );
  const [selected, setSelected] = useState(new Set(selectedCategoryIds));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const types = categories.filter((c) => c.categoryType === "OPPORTUNITY_TYPE");
  const industries = categories.filter((c) => c.categoryType === "INDUSTRY");

  return (
    <form action={action} className="grid gap-8">
      <FormError message={state.error} />
      {state.ok ? <FormNotice message="Preferences saved." /> : null}

      {[...selected].map((id) => (
        <input key={id} type="hidden" name="categoryIds" value={id} />
      ))}

      <fieldset className="grid gap-2.5">
        <legend className="eyebrow mb-2">What to send</legend>
        <Toggle
          name="weekly"
          defaultChecked={weekly}
          title="The Weekly Radar"
          description="Newly announced opportunities matching your interests, plus the ones closing soon."
        />
        <Toggle
          name="reminders"
          defaultChecked={reminders}
          title="Deadline reminders by email"
          description="A nudge before the deadline on anything you have put on your Radar."
        />
        <Toggle
          name="whatsappAlerts"
          defaultChecked={whatsappAlerts}
          disabled={!hasWhatsapp}
          title="Urgent reminders on WhatsApp"
          description={
            hasWhatsapp
              ? "Only for deadlines inside 48 hours. Never marketing."
              : "Add a WhatsApp number in your profile to turn this on."
          }
        />
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">Which opportunities</legend>
        <p className="hint mb-3">
          Leave everything unticked to hear about all of them.
        </p>

        <p className="mt-1 mb-2 text-[13px] font-medium">Funding type</p>
        <div className="flex flex-wrap gap-1.5">
          {types.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              on={selected.has(category.id)}
              onClick={() => toggle(category.id)}
            />
          ))}
        </div>

        <p className="mt-5 mb-2 text-[13px] font-medium">Industry</p>
        <div className="flex flex-wrap gap-1.5">
          {industries.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              on={selected.has(category.id)}
              onClick={() => toggle(category.id)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2.5">
        <legend className="eyebrow mb-2">Consent</legend>
        <p className="hint mb-1">
          Each channel is separate. Turning one off stops it immediately, and
          turning both off stops everything.
        </p>
        <Toggle
          name="emailConsent"
          defaultChecked={emailConsent}
          title="Email me funding opportunities"
          description="Required for the Weekly Radar and email reminders."
        />
        <Toggle
          name="whatsappConsent"
          defaultChecked={whatsappConsent}
          disabled={!hasWhatsapp}
          title="Message me on WhatsApp"
          description="Required for WhatsApp deadline alerts."
        />
      </fieldset>

      <div className="border-t border-line pt-6">
        <SubmitButton pendingLabel="Saving…">Save preferences</SubmitButton>
      </div>
    </form>
  );
}

function Toggle({
  name,
  title,
  description,
  defaultChecked,
  disabled,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[10px] border border-line p-4 transition-colors duration-200",
        disabled ? "cursor-not-allowed opacity-60" : "hover:border-line-strong has-checked:border-ink",
      )}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked && !disabled}
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 accent-ink"
      />
      <span>
        <span className="block text-[14.5px] font-medium">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">
          {description}
        </span>
      </span>
    </label>
  );
}

function Chip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "pill transition-colors duration-200",
        on ? "pill-accent" : "hover:border-line-strong",
      )}
    >
      {label}
    </button>
  );
}
