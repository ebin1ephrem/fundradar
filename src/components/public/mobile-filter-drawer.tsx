"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileFilterDrawer({
  activeCount,
  clearHref,
  children,
}: {
  activeCount: number;
  clearHref: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const closeButton = panel?.querySelector<HTMLElement>("[data-drawer-close]");
    closeButton?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => !element.hasAttribute("disabled"),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="filter-drawer-trigger btn btn-secondary min-h-11 flex-1 px-3.5 sm:flex-none"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="size-4" strokeWidth={1.7} aria-hidden="true" />
        Filters
        {activeCount > 0 ? (
          <span className="grid size-5 place-items-center rounded-full bg-ink text-[11px] text-white tabular-nums">
            {activeCount}
          </span>
        ) : null}
      </button>

      <noscript>
        <style>{`.filter-drawer-trigger{display:none!important}`}</style>
        <details className="flex-1 rounded-[8px] border border-line bg-canvas">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3.5 text-[14px] font-medium">
            <SlidersHorizontal className="size-4" strokeWidth={1.7} aria-hidden="true" />
            Filters{activeCount > 0 ? ` · ${activeCount}` : ""}
          </summary>
          <div className="border-t border-line p-4">{children}</div>
          <div className="border-t border-line p-4">
            <Link href={clearHref} className="btn btn-secondary w-full">
              Clear all filters
            </Link>
          </div>
        </details>
      </noscript>

      {open ? (
        <div
          className="fixed inset-0 z-[70] bg-black/30"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="filter-drawer ml-auto flex h-full w-full max-w-[430px] flex-col bg-canvas shadow-[-18px_0_50px_rgba(0,0,0,0.14)]"
            onClickCapture={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("a[href]")) setOpen(false);
            }}
          >
            <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-line bg-canvas px-5">
              <div>
                <h2 id={titleId} className="text-[18px] font-medium tracking-[-0.025em]">
                  Filters
                </h2>
                <p className="text-[12px] text-muted">
                  {activeCount > 0 ? `${activeCount} active` : "No filters selected"}
                </p>
              </div>
              <button
                data-drawer-close
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-11 place-items-center rounded-[8px] border border-line text-muted hover:border-line-strong hover:text-ink"
                aria-label="Close filters"
              >
                <X className="size-5" strokeWidth={1.7} aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {children}
            </div>

            <div className="border-t border-line bg-canvas p-4">
              <Link href={clearHref} className="btn btn-secondary w-full">
                Clear all filters
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
