"use client";

import { useState } from "react";
import type { SavedStatus } from "@prisma/client";
import { updateSavedStatusAction } from "@/app/actions/leads";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

const OPTIONS: { value: SavedStatus; label: string }[] = [
  { value: "SAVED", label: "Saved" },
  { value: "INTERESTED", label: "Interested" },
  { value: "APPLIED", label: "Applied" },
  { value: "NOT_RELEVANT", label: "Not relevant" },
];

export function SavedRowControls({
  savedId,
  status,
  notes,
}: {
  savedId: string;
  status: SavedStatus;
  notes: string;
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<SavedStatus>(status);

  return (
    <form action={updateSavedStatusAction} className="mt-4 border-t border-line pt-4">
      <input type="hidden" name="savedId" value={savedId} />
      <input type="hidden" name="status" value={choice} />

      <div className="flex flex-wrap items-center gap-1.5">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="submit"
            onClick={() => setChoice(option.value)}
            aria-pressed={choice === option.value}
            className={cn(
              "pill transition-colors duration-200",
              choice === option.value ? "pill-dark" : "hover:border-line-strong",
            )}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto text-[12.5px] text-muted underline underline-offset-2 hover:text-ink"
        >
          {notes ? "Edit note" : "Add a note"}
        </button>
      </div>

      <div className={cn("mt-3", !open && "sr-only")}>
        <label htmlFor={`notes-${savedId}`} className="label">
          Your notes
        </label>
        {/* Always present so changing the status never drops an existing note. */}
        <textarea
          id={`notes-${savedId}`}
          name="notes"
          rows={3}
          defaultValue={notes}
          placeholder="What you need to prepare, who to contact, why this one fits…"
          className="field"
        />
        <SubmitButton variant="secondary" className="btn-sm mt-2">
          Save note
        </SubmitButton>
      </div>

      {notes && !open ? (
        <p className="mt-3 rounded-[8px] bg-subtle px-3.5 py-2.5 text-[13px] text-muted">
          {notes}
        </p>
      ) : null}

    </form>
  );
}
