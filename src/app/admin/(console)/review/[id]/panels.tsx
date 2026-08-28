"use client";

import { useState } from "react";
import { Check, ChevronDown, Sparkles, X } from "lucide-react";
import { ConfidenceDot, confidenceBand } from "@/components/admin/confidence";
import { cn } from "@/lib/utils";
import { resolveSuggestionAction } from "../actions";
import { reextractAction } from "../../ingest/actions";
import { rejectAction } from "../actions";

export type FieldRow = {
  field: string;
  label: string;
  value: string | null;
  confidence: number | null;
  evidence: string | null;
  isUnknown: boolean;
};

/** Per-field confidence with the quote it came from. */
export function ExtractedFields({ rows }: { rows: FieldRow[] }) {
  const [open, setOpen] = useState(false);
  const known = rows.filter((r) => !r.isUnknown && r.value);
  const needsCheck = known.filter((r) => confidenceBand(r.confidence).needsCheck);
  const shown = open ? known : needsCheck.length ? needsCheck : known.slice(0, 6);

  if (known.length === 0) return null;

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span>
          <span className="text-[13.5px] font-medium">What we read, and from where</span>
          <span className="mt-0.5 block text-[12px] text-muted">
            {needsCheck.length
              ? `${needsCheck.length} field${needsCheck.length === 1 ? "" : "s"} worth checking against the source`
              : `${known.length} fields, all read with high confidence`}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-180")}
          strokeWidth={1.7}
        />
      </button>

      <ul className="divide-y divide-line border-t border-line">
        {shown.map((row) => (
          <li key={row.field} className="px-5 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] text-muted">{row.label}</span>
              <ConfidenceDot confidence={row.confidence} showLabel />
            </div>
            <p className="mt-0.5 text-[13.5px] break-words">{row.value}</p>
            {row.evidence ? (
              <p className="mt-1.5 border-l-2 border-line pl-2.5 text-[12px] leading-relaxed text-faint italic">
                “{row.evidence}”
              </p>
            ) : (
              <p className="mt-1.5 text-[12px] text-faint">No excerpt was recorded.</p>
            )}
          </li>
        ))}
      </ul>

      {!open && known.length > shown.length ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full border-t border-line px-5 py-2.5 text-[12.5px] text-muted hover:text-ink"
        >
          Show all {known.length} fields
        </button>
      ) : null}
    </section>
  );
}

/** The spec's "information we couldn't confirm" panel. */
export function MissingPanel({
  rows,
  opportunityId,
  sourceUrl,
}: {
  rows: FieldRow[];
  opportunityId: string;
  sourceUrl: string | null;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="card p-5">
      <h2 className="text-[13.5px] font-medium">Information we could not confirm</h2>
      <p className="hint mt-1">
        The material did not state these. They were left blank rather than
        guessed — fill in anything you know, or leave them unknown.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <span key={row.field} className="pill">
            {row.label}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        <form action={reextractAction}>
          <input type="hidden" name="opportunityId" value={opportunityId} />
          <button type="submit" className="btn btn-secondary btn-sm">
            <Sparkles className="size-3.5" strokeWidth={1.7} />
            Re-read the source
          </button>
        </form>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-secondary btn-sm"
          >
            Open the source
          </a>
        ) : null}
      </div>
    </section>
  );
}

export type Suggestion = {
  id: string;
  name: string;
  type: string | null;
  confidence: number | null;
  reason: string | null;
  isNew: boolean;
  alreadyOn: boolean;
};

/**
 * Suggested categories stay suggestions until an admin accepts them. A category
 * the model wants but that does not exist is proposed by name only — taxonomy
 * is never created automatically.
 */
export function SuggestedCategories({ suggestions }: { suggestions: Suggestion[] }) {
  if (suggestions.length === 0) return null;

  const existing = suggestions.filter((s) => !s.isNew);
  const invented = suggestions.filter((s) => s.isNew);

  return (
    <section className="card p-5">
      <h2 className="text-[13.5px] font-medium">Suggested categories</h2>
      <p className="hint mt-1">
        Accept the ones that fit. Nothing here is applied until you say so.
      </p>

      {existing.length ? (
        <ul className="mt-3 grid gap-1.5">
          {existing.map((suggestion) => (
            <li
              key={suggestion.id}
              className="flex flex-wrap items-center gap-2 rounded-[8px] border border-line px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px]">
                  {suggestion.name}
                  {suggestion.alreadyOn ? (
                    <span className="ml-1.5 text-[11.5px] text-ok">already applied</span>
                  ) : null}
                </span>
                {suggestion.reason ? (
                  <span className="mt-0.5 block truncate text-[11.5px] text-faint">
                    {suggestion.reason}
                  </span>
                ) : null}
              </span>
              <ConfidenceDot confidence={suggestion.confidence} showLabel />
              <span className="flex gap-1">
                <form action={resolveSuggestionAction}>
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <input type="hidden" name="accept" value="1" />
                  <button
                    type="submit"
                    aria-label={`Accept ${suggestion.name}`}
                    className="grid size-7 place-items-center rounded-[6px] border border-line text-muted transition-colors hover:border-ink hover:bg-accent hover:text-ink"
                  >
                    <Check className="size-3.5" strokeWidth={2.2} />
                  </button>
                </form>
                <form action={resolveSuggestionAction}>
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <input type="hidden" name="accept" value="0" />
                  <button
                    type="submit"
                    aria-label={`Dismiss ${suggestion.name}`}
                    className="grid size-7 place-items-center rounded-[6px] border border-line text-muted transition-colors hover:border-danger/40 hover:text-danger"
                  >
                    <X className="size-3.5" strokeWidth={2.2} />
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {invented.length ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-[12.5px] font-medium">Categories that do not exist yet</p>
          <p className="hint mt-1">
            Proposed by name only. Create one if it is genuinely useful.
          </p>
          <ul className="mt-2.5 grid gap-1.5">
            {invented.map((suggestion) => (
              <li
                key={suggestion.id}
                className="flex flex-wrap items-center gap-2 rounded-[8px] border border-dashed border-line-strong px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-[13.5px]">
                  {suggestion.name}
                </span>
                <a
                  href={`/admin/categories/new?name=${encodeURIComponent(suggestion.name)}`}
                  className="btn btn-secondary btn-sm"
                >
                  Create category
                </a>
                <form action={resolveSuggestionAction}>
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <input type="hidden" name="accept" value="0" />
                  <button type="submit" className="btn btn-ghost btn-sm">
                    Ignore
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

const REASONS = [
  ["NOT_A_STARTUP_FUNDING_OPPORTUNITY", "Not a startup funding opportunity"],
  ["DUPLICATE", "Duplicate"],
  ["EXPIRED", "Expired"],
  ["INCORRECT_INFORMATION", "Incorrect information"],
  ["UNRELIABLE_SOURCE", "Unreliable source"],
  ["UNABLE_TO_VERIFY", "Insufficient information"],
  ["NOT_RELEVANT_TO_USERS", "Outside FundRadar's scope"],
  ["SPAM", "Spam"],
  ["OTHER", "Other"],
] as const;

export function RejectPanel({ opportunityId }: { opportunityId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-secondary btn-sm w-full"
      >
        Reject
      </button>
    );
  }

  return (
    <form action={rejectAction} className="grid gap-2.5 rounded-[10px] border border-line p-3.5">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <p className="text-[12.5px] font-medium">Why are you rejecting this?</p>
      <p className="hint">
        We remember it, so the crawler does not bring the same thing back.
      </p>
      <select name="reason" className="field h-9 text-[13px]" aria-label="Rejection reason">
        {REASONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        name="note"
        rows={2}
        className="field text-[13px]"
        placeholder="Optional note for the team"
      />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm flex-1">
          Reject
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
