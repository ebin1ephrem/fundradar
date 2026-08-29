"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { captureLeadAction, type LeadCaptureState } from "@/app/actions/leads";
import { Field } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useLeadGate } from "./gate-context";
import { BENEFITS, gateCopy } from "./copy";
import { leadCapture } from "@/content/copy";

export function LeadModal() {
  const { isOpen, close, subject, reason } = useLeadGate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [done, setDone] = useState(false);

  const [state, action] = useActionState<LeadCaptureState, FormData>(
    captureLeadAction,
    {},
  );

  // A native dialog gives focus trapping, Escape and inertness for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (!state.ok) return;
    setDone(true);
    // Re-render the server components so the unlocked content appears in place.
    router.refresh();
    const timer = setTimeout(() => {
      close();
      setDone(false);
    }, 2600);
    return () => clearTimeout(timer);
  }, [state.ok, router, close]);

  const copy = gateCopy(subject);

  return (
    <dialog
      ref={dialogRef}
      onClose={close}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      aria-labelledby="lead-modal-title"
      className="m-auto w-[calc(100vw-32px)] max-w-[880px] rounded-[16px] border border-line bg-canvas p-0 shadow-[0_30px_80px_rgba(0,0,0,0.16)] backdrop:bg-ink/45 backdrop:backdrop-blur-[2px] open:scale-in"
    >
      {done ? (
        <div className="px-8 py-16 text-center">
          <span
            aria-hidden="true"
            className="mx-auto grid size-12 place-items-center rounded-full bg-accent text-ink"
          >
            <Check className="size-6" strokeWidth={2.4} />
          </span>
          <h2 className="display-md mt-5">
            {leadCapture.confirmation.headline}
          </h2>
          <p className="lede mx-auto mt-3 max-w-[46ch]">
            {leadCapture.confirmation.body}
          </p>
          <p className="mx-auto mt-3 max-w-[46ch] text-[14px] text-muted">
            {subject.kind === "opportunity"
              ? leadCapture.confirmation.handoff
              : null}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_1.05fr]">
          <div className="relative hidden flex-col justify-center gap-9 bg-ink p-8 text-on-dark md:flex">
            <div
              className="dot-grid-dark pointer-events-none absolute inset-0 opacity-40"
              aria-hidden="true"
            />
            <div className="relative">
              {copy.eyebrow ? (
                <p className="pill pill-accent mb-5">{copy.eyebrow}</p>
              ) : null}
              <p className="text-[13px] tracking-[0.08em] text-on-dark-muted uppercase">
                {leadCapture.general.prompt}
              </p>
              <ul className="mt-5 grid gap-2.5">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2.5 text-[15px]">
                    <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-accent text-ink">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <p className="relative text-[13px] leading-relaxed text-on-dark-muted">
              {leadCapture.general.footnote}
            </p>
          </div>

          <div className="relative p-7 sm:p-8">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-4 right-4 grid size-8 place-items-center rounded-[6px] text-faint transition-colors duration-200 hover:bg-subtle hover:text-ink"
            >
              <X className="size-4" strokeWidth={1.7} />
            </button>

            <h2
              id="lead-modal-title"
              className="max-w-[20ch] text-[26px] leading-[1.15] font-medium tracking-[-0.03em]"
            >
              {copy.headline}
            </h2>
            <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-muted">
              {copy.body}
            </p>

            <form action={action} className="mt-6 grid gap-3.5">
              <input type="hidden" name="source" value={reason ?? "lead_popup"} />
              {subject.opportunityId ? (
                <input type="hidden" name="opportunityId" value={subject.opportunityId} />
              ) : null}
              {(subject.categoryIds ?? []).map((id) => (
                <input key={id} type="hidden" name="categoryIds" value={id} />
              ))}
              <input
                type="hidden"
                name="path"
                value={typeof window === "undefined" ? "" : window.location.pathname}
              />

              {state.error ? (
                <p role="alert" className="text-[13px] text-danger">
                  {state.error}
                </p>
              ) : null}

              <Field
                label={leadCapture.fields.name}
                htmlFor="lead-name"
                error={state.fieldErrors?.name}
              >
                <input
                  id="lead-name"
                  name="name"
                  className="field"
                  required
                  autoComplete="name"
                  placeholder="Priya Nair"
                />
              </Field>

              <Field
                label={leadCapture.fields.email}
                htmlFor="lead-email"
                error={state.fieldErrors?.email}
              >
                <input
                  id="lead-email"
                  name="email"
                  type="email"
                  className="field"
                  required
                  autoComplete="email"
                  placeholder="you@startup.com"
                />
              </Field>

              <Field
                label={leadCapture.fields.whatsapp}
                htmlFor="lead-whatsapp"
                error={state.fieldErrors?.whatsapp}
                hint={leadCapture.fields.whatsappHint}
              >
                <input
                  id="lead-whatsapp"
                  name="whatsapp"
                  type="tel"
                  className="field"
                  required
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                />
              </Field>

              <Field
                label={leadCapture.fields.startup}
                htmlFor="lead-startup"
                hint="Optional."
              >
                <input
                  id="lead-startup"
                  name="startupName"
                  className="field"
                  autoComplete="organization"
                  placeholder="Acme Robotics"
                />
              </Field>

              <SubmitButton
                variant="accent"
                className="mt-1 w-full"
                pendingLabel="Setting you up…"
              >
                {copy.cta}
              </SubmitButton>

              <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted">
                <Check
                  className="mt-[2px] size-3.5 shrink-0 text-ink"
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
                <span>
                  {leadCapture.consent.email} You can change what you hear
                  about, or stop either channel, at any time.
                </span>
              </p>
            </form>
          </div>
        </div>
      )}
    </dialog>
  );
}
