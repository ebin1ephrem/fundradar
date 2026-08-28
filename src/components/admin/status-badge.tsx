import type { LifecycleStatus, WorkflowStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { LIFECYCLE_LABEL, WORKFLOW_LABEL } from "@/lib/opportunity-status";

const WORKFLOW_TONE: Record<WorkflowStatus, string> = {
  PUBLISHED: "border-ink bg-ink text-white",
  APPROVED: "border-accent bg-accent text-ink",
  DRAFT: "border-line text-muted",
  PENDING_REVIEW: "border-warn/40 bg-warn/5 text-warn",
  UPDATE_PENDING_REVIEW: "border-warn/40 bg-warn/5 text-warn",
  NEEDS_INFORMATION: "border-warn/40 bg-warn/5 text-warn",
  DISCOVERED: "border-line text-faint",
  EXTRACTING: "border-line text-faint",
  REJECTED: "border-danger/30 bg-danger/5 text-danger",
  ARCHIVED: "border-line text-faint",
};

export function WorkflowBadge({ status }: { status: WorkflowStatus }) {
  return (
    <span className={cn("pill", WORKFLOW_TONE[status])}>
      {WORKFLOW_LABEL[status] ?? status}
    </span>
  );
}

const LIFECYCLE_TONE: Record<LifecycleStatus, string> = {
  OPEN: "border-ok/30 bg-ok/5 text-ok",
  CLOSING_SOON: "pill-accent",
  UPCOMING: "border-line text-muted",
  ROLLING: "border-line text-muted",
  CLOSED: "border-line text-faint",
};

export function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  return (
    <span className={cn("pill", LIFECYCLE_TONE[status])}>
      {LIFECYCLE_LABEL[status]}
    </span>
  );
}
