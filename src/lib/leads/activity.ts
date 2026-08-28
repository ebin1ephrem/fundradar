import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** The behaviours worth keeping. Anything else is noise in the timeline. */
export const ACTIVITY_TYPES = {
  arrived: "Arrived on the site",
  opportunity_view: "Viewed an opportunity",
  category_view: "Viewed a category",
  search: "Searched",
  unlock_requested: "Asked to see more",
  lead_captured: "Gave their details",
  opportunity_unlocked: "Unlocked an opportunity",
  opportunity_saved: "Saved an opportunity",
  opportunity_unsaved: "Removed a saved opportunity",
  saved_status_changed: "Updated a saved opportunity",
  apply_clicked: "Opened the official application",
  reminder_requested: "Asked for a deadline reminder",
  matches_requested: "Asked for funding matches",
  alerts_updated: "Changed their alert preferences",
  profile_updated: "Added profile details",
  signed_in: "Signed back in",
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;

export async function recordActivity(entry: {
  type: ActivityType;
  leadId?: string | null;
  visitorId?: string | null;
  description?: string;
  opportunityId?: string | null;
  categoryId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  if (!entry.leadId && !entry.visitorId) return;

  try {
    await prisma.leadActivity.create({
      data: {
        type: entry.type,
        leadId: entry.leadId ?? null,
        visitorId: entry.visitorId ?? null,
        description: entry.description ?? ACTIVITY_TYPES[entry.type],
        opportunityId: entry.opportunityId ?? null,
        categoryId: entry.categoryId ?? null,
        metadata: entry.metadata,
      },
    });
  } catch {
    // Behavioural tracking must never break the page it is observing.
  }
}

/** Interests are inferred from what someone actually looks at. */
export async function noteInterest(
  leadId: string | null,
  categoryIds: string[],
  source: string,
): Promise<void> {
  if (!leadId || categoryIds.length === 0) return;
  try {
    await prisma.$transaction(
      categoryIds.map((categoryId) =>
        prisma.leadCategoryInterest.upsert({
          where: { leadId_categoryId: { leadId, categoryId } },
          create: { leadId, categoryId, source },
          update: { weight: { increment: 1 } },
        }),
      ),
    );
  } catch {
    // ignore
  }
}
