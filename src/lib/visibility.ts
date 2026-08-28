import type { Prisma, WorkflowStatus } from "@prisma/client";

/**
 * The single definition of "publicly visible", enforced at the query layer
 * rather than in the interface.
 *
 * UPDATE_PENDING_REVIEW is included on purpose: it means a change was detected
 * on an already-approved record. The approved version stays live and unchanged
 * until an admin approves the update — the page must not vanish because a
 * crawler noticed a new deadline.
 *
 * Everything else — DISCOVERED, EXTRACTING, PENDING_REVIEW, NEEDS_INFORMATION,
 * DRAFT, APPROVED, REJECTED, ARCHIVED — is invisible to the public.
 */
export const PUBLIC_WORKFLOW_STATUSES: WorkflowStatus[] = [
  "PUBLISHED",
  "UPDATE_PENDING_REVIEW",
];

/** SQL fragment for the raw search queries. */
export const PUBLIC_STATUS_SQL = PUBLIC_WORKFLOW_STATUSES.map((s) => `'${s}'`).join(", ");

export const publiclyVisible: Prisma.OpportunityWhereInput = {
  workflowStatus: { in: PUBLIC_WORKFLOW_STATUSES },
  isActive: true,
};

export function isPubliclyVisible(opportunity: {
  workflowStatus: WorkflowStatus;
  isActive: boolean;
}): boolean {
  return (
    opportunity.isActive &&
    PUBLIC_WORKFLOW_STATUSES.includes(opportunity.workflowStatus)
  );
}
