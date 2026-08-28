import type { LifecycleStatus } from "@prisma/client";
import { daysUntil } from "@/lib/utils";

export const CLOSING_SOON_DAYS = 7;

export type LifecycleInput = {
  applicationDeadline: Date | string | null;
  applicationOpenDate?: Date | string | null;
  isRollingDeadline?: boolean;
  lifecycleOverride?: LifecycleStatus | null;
};

/**
 * Derived from the dates on the record. An admin override always wins, which
 * is how "deadline passed but the programme is still accepting" is handled.
 */
export function lifecycleStatus(input: LifecycleInput): LifecycleStatus {
  if (input.lifecycleOverride) return input.lifecycleOverride;
  if (input.isRollingDeadline) return "ROLLING";

  const opensIn = daysUntil(input.applicationOpenDate ?? null);
  if (opensIn !== null && opensIn > 0) return "UPCOMING";

  const closesIn = daysUntil(input.applicationDeadline);
  if (closesIn === null) return "OPEN";
  if (closesIn < 0) return "CLOSED";
  if (closesIn <= CLOSING_SOON_DAYS) return "CLOSING_SOON";
  return "OPEN";
}

export const LIFECYCLE_LABEL: Record<LifecycleStatus, string> = {
  UPCOMING: "Upcoming",
  OPEN: "Open",
  CLOSING_SOON: "Closing Soon",
  CLOSED: "Closed",
  ROLLING: "Rolling",
};

export function deadlineLabel(
  deadline: Date | string | null,
  isRolling: boolean,
): string {
  if (isRolling) return "Rolling deadline";
  if (!deadline) return "Deadline not specified";
  const days = daysUntil(deadline);
  if (days === null) return "Deadline not specified";
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export const WORKFLOW_LABEL: Record<string, string> = {
  DISCOVERED: "Discovered",
  EXTRACTING: "Extracting",
  PENDING_REVIEW: "Pending review",
  NEEDS_INFORMATION: "Needs information",
  DRAFT: "Draft",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
  UPDATE_PENDING_REVIEW: "Update pending review",
};
