import type { Prisma, WorkflowStatus } from "@prisma/client";

/**
 * The presentation layer between the database's lifecycle states and what an
 * administrator sees.
 *
 * The database keeps ten WorkflowStatus values because ingestion, change
 * detection and moderation each need their own. An administrator does not: the
 * job is "review what came in, draft it, publish it". This module maps the
 * former onto the latter. It adds no status, renames nothing in the database,
 * and is the single place the admin views agree on what each tab means.
 */

/** Waiting for a person. Everything that arrives from any ingestion source —
 *  crawler, source monitoring, pasted text, URL, manual, import, AI extraction
 *  — converges here once it is ready to be looked at. */
export const TO_REVIEW_STATUSES: WorkflowStatus[] = [
  "PENDING_REVIEW",
  "UPDATE_PENDING_REVIEW",
  "NEEDS_INFORMATION",
];

/**
 * Being written by an admin.
 *
 * APPROVED is included deliberately. No code path writes it — the publish
 * action moves a record straight from DRAFT to PUBLISHED — but the enum value
 * exists, so any record that ever carried it belongs with the drafts rather
 * than vanishing from every view. It is never surfaced as a separate step.
 */
export const DRAFT_STATUSES: WorkflowStatus[] = ["DRAFT", "APPROVED"];

/** Live on the public site. Mirrors lib/visibility, which remains the
 *  authority for what the public can actually see. */
export const PUBLISHED_STATUSES: WorkflowStatus[] = [
  "PUBLISHED",
  "UPDATE_PENDING_REVIEW",
];

/** Still moving through ingestion. Never shown in opportunity navigation. */
export const INTERNAL_STATUSES: WorkflowStatus[] = ["DISCOVERED", "EXTRACTING"];

/** What an administrator sees instead of the raw enum value. */
export const ADMIN_STATUS_LABEL: Record<WorkflowStatus, string> = {
  DISCOVERED: "Collecting",
  EXTRACTING: "Collecting",
  PENDING_REVIEW: "To review",
  UPDATE_PENDING_REVIEW: "To review",
  NEEDS_INFORMATION: "To review",
  DRAFT: "Draft",
  APPROVED: "Draft",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

// ---------------------------------------------------------------------------
// Expiry
// ---------------------------------------------------------------------------

/**
 * Expiry is not a stored status — lifecycleStatus() derives it from the dates
 * on the record. These fragments express the same rule in SQL so a list can be
 * filtered in the database instead of in memory.
 *
 * Kept deliberately in step with lifecycleStatus(): an admin override always
 * wins, a rolling deadline never expires, and a record with no deadline is
 * open rather than expired.
 */
export function expiredWhere(now = new Date()): Prisma.OpportunityWhereInput {
  return {
    OR: [
      // Explicitly overridden to closed.
      { lifecycleOverride: "CLOSED" },
      // Or the deadline has passed and nothing overrides it. A NULL deadline
      // never matches `lt`, so undated records are correctly not expired.
      {
        lifecycleOverride: null,
        isRollingDeadline: false,
        applicationDeadline: { lt: now },
      },
    ],
  };
}

/**
 * Spelled out rather than written as `NOT expiredWhere()`.
 *
 * `NOT (lifecycleOverride = 'CLOSED')` is NULL — not true — for every row whose
 * override is NULL, so a negated form silently drops the majority of records.
 * Enumerating the not-expired cases keeps it NULL-safe.
 */
export function notExpiredWhere(now = new Date()): Prisma.OpportunityWhereInput {
  return {
    OR: [
      // An override to anything other than closed keeps it live.
      { lifecycleOverride: { in: ["UPCOMING", "OPEN", "CLOSING_SOON", "ROLLING"] } },
      // No override: rolling programmes never expire...
      { lifecycleOverride: null, isRollingDeadline: true },
      // ...nor do those with no stated deadline...
      { lifecycleOverride: null, isRollingDeadline: false, applicationDeadline: null },
      // ...nor those whose deadline is still ahead.
      {
        lifecycleOverride: null,
        isRollingDeadline: false,
        applicationDeadline: { gte: now },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// The Opportunities tabs
// ---------------------------------------------------------------------------

export const OPPORTUNITY_TABS = ["all", "published", "drafts", "expired"] as const;
export type OpportunityTab = (typeof OPPORTUNITY_TABS)[number];

export const OPPORTUNITY_TAB_LABEL: Record<OpportunityTab, string> = {
  all: "All",
  published: "Published",
  drafts: "Drafts",
  expired: "Expired",
};

/** Older links used the enum name (`?status=DRAFT`). Map those onto the tab. */
const TAB_ALIASES: Record<string, OpportunityTab> = {
  draft: "drafts",
  published: "published",
  expired: "expired",
  all: "all",
};

export function resolveOpportunityTab(
  ...candidates: (string | undefined)[]
): OpportunityTab {
  for (const raw of candidates) {
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (OPPORTUNITY_TABS.includes(key as OpportunityTab)) return key as OpportunityTab;
    if (TAB_ALIASES[key]) return TAB_ALIASES[key];
  }
  return "all";
}

/**
 * One definition of what each tab holds, used for both the rows and the counts
 * so a tab can never disagree with its own number.
 *
 * "All" is Published + Drafts and nothing else: no review records, no rejected
 * records, no archived records, and no expired ones. Expired opportunities load
 * only when the administrator asks for them.
 */
export function opportunityTabWhere(
  tab: OpportunityTab,
  now = new Date(),
): Prisma.OpportunityWhereInput {
  switch (tab) {
    case "published":
      return {
        workflowStatus: { in: PUBLISHED_STATUSES },
        AND: [notExpiredWhere(now)],
      };
    case "drafts":
      return {
        workflowStatus: { in: DRAFT_STATUSES },
        AND: [notExpiredWhere(now)],
      };
    case "expired":
      return {
        workflowStatus: { in: [...PUBLISHED_STATUSES, ...DRAFT_STATUSES] },
        AND: [expiredWhere(now)],
      };
    case "all":
    default:
      return {
        workflowStatus: { in: [...PUBLISHED_STATUSES, ...DRAFT_STATUSES] },
        AND: [notExpiredWhere(now)],
      };
  }
}

/** Admin copy for each empty tab. Plain, no marketing. */
export const OPPORTUNITY_TAB_EMPTY: Record<
  OpportunityTab,
  { title: string; body: string }
> = {
  all: {
    title: "No opportunities",
    body: "Drafted and published opportunities will appear here.",
  },
  published: {
    title: "No published opportunities",
    body: "Published opportunities will appear here.",
  },
  drafts: {
    title: "No drafts",
    body: "Opportunities saved for editing will appear here.",
  },
  expired: {
    title: "No expired opportunities",
    body: "Opportunities whose deadline has passed will appear here.",
  },
};
