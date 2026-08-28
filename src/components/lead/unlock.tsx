"use client";

import { useTransition } from "react";
import { Bell, Bookmark, BookmarkCheck, Lock } from "lucide-react";
import { toggleSaveAction, requestReminderAction } from "@/app/actions/leads";
import { cn } from "@/lib/utils";
import { useLeadGate } from "./gate-context";
import { track } from "./tracker";

/** Every gated control routes through the same guard. */
function useGuarded(reason: string) {
  const { guard } = useLeadGate();
  const [pending, startTransition] = useTransition();

  return {
    pending,
    run: (action: () => Promise<void> | void) => {
      const allowed = guard(reason, () => startTransition(() => void action()));
      if (!allowed) track({ type: "unlock_requested" });
    },
  };
}

export function SaveButton({
  opportunityId,
  title,
  saved,
  variant = "icon",
}: {
  opportunityId: string;
  title: string;
  saved?: boolean;
  variant?: "icon" | "full";
}) {
  const { pending, run } = useGuarded("save_opportunity");

  const submit = () => {
    const data = new FormData();
    data.set("opportunityId", opportunityId);
    return toggleSaveAction(data);
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => run(submit)}
        aria-pressed={saved}
        className={cn("btn btn-secondary", saved && "border-ink")}
      >
        {saved ? (
          <BookmarkCheck className="size-4" strokeWidth={1.7} />
        ) : (
          <Bookmark className="size-4" strokeWidth={1.7} />
        )}
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(submit)}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      title={saved ? "Saved" : "Save this opportunity"}
      className={cn(
        "relative z-10 grid size-8 shrink-0 place-items-center rounded-[6px] border transition-colors duration-200",
        saved
          ? "border-ink bg-ink text-accent"
          : "border-line text-faint hover:border-line-strong hover:text-ink",
      )}
    >
      {saved ? (
        <BookmarkCheck className="size-4" strokeWidth={1.7} />
      ) : (
        <Bookmark className="size-4" strokeWidth={1.6} />
      )}
    </button>
  );
}

export function ReminderButton({ opportunityId }: { opportunityId: string }) {
  const { pending, run } = useGuarded("deadline_reminder");

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        run(() => {
          const data = new FormData();
          data.set("opportunityId", opportunityId);
          return requestReminderAction(data);
        })
      }
      className="btn btn-secondary"
    >
      <Bell className="size-4" strokeWidth={1.7} />
      Get reminder
    </button>
  );
}

/** Stands in for a section the visitor has not unlocked yet. */
export function LockedSection({
  title,
  teaser,
  reason,
}: {
  title: string;
  teaser: string;
  reason: string;
}) {
  const { open } = useLeadGate();

  return (
    <section className="scroll-mt-24 border-t border-line pt-8">
      <h2 className="mb-4 text-[21px] leading-tight font-medium tracking-[-0.028em]">
        {title}
      </h2>
      <div className="relative overflow-hidden rounded-[12px] border border-line bg-subtle px-6 py-8">
        <div
          className="dot-grid pointer-events-none absolute inset-0 opacity-30"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-[46ch]">
            <p className="flex items-center gap-2 text-[14.5px] font-medium">
              <Lock className="size-4 text-muted" strokeWidth={1.7} />
              {teaser}
            </p>
            <p className="mt-1.5 text-[13.5px] text-muted">
              Tell us where to send funding opportunities and this opens
              straight away — no password, no account to set up.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => {
              open(reason);
              track({ type: "unlock_requested" });
            }}
          >
            Show me
          </button>
        </div>
      </div>
    </section>
  );
}

export function ApplyLink({
  opportunityId,
  href,
  children,
}: {
  opportunityId: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={() => track({ type: "apply_clicked", opportunityId })}
      className="btn btn-accent w-full"
    >
      {children}
    </a>
  );
}
