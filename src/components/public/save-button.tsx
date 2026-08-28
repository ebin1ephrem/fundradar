"use client";

import { Bookmark } from "lucide-react";

/**
 * Saving is a lead-capture trigger. The popup and the persistence behind it
 * land in phase 3; until then this is the interaction surface, and it says so
 * rather than pretending to have saved anything.
 */
export function SaveButton({
  opportunityId,
  title,
}: {
  opportunityId: string;
  title: string;
}) {
  return (
    <button
      type="button"
      data-opportunity-id={opportunityId}
      aria-label={`Save ${title}`}
      title="Save this opportunity"
      className="relative z-10 grid size-8 shrink-0 place-items-center rounded-[6px] border border-line text-faint transition-colors duration-200 hover:border-line-strong hover:text-ink"
    >
      <Bookmark className="size-4" strokeWidth={1.6} />
    </button>
  );
}
