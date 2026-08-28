"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** What the visitor is looking at, so the popup can speak to it. */
export type GateSubject = {
  kind: "opportunity" | "category" | "founder" | "search" | "general";
  label?: string;
  /** How many opportunities match what they are looking at. */
  count?: number;
  categoryIds?: string[];
  opportunityId?: string;
};

type GateValue = {
  identified: boolean;
  subject: GateSubject;
  isOpen: boolean;
  /** The action the visitor was trying to take, used as the capture source. */
  reason: string | null;
  setSubject: (subject: GateSubject) => void;
  open: (reason: string) => void;
  close: () => void;
  /**
   * Runs `action` when the visitor is already known, and opens the popup when
   * they are not. Every gated control goes through this.
   */
  guard: (reason: string, action?: () => void) => boolean;
};

const Ctx = createContext<GateValue | null>(null);

const VIEW_KEY = "fr_views";

export function LeadGateProvider({
  identified,
  enabled,
  viewsBeforePrompt,
  children,
}: {
  identified: boolean;
  enabled: boolean;
  viewsBeforePrompt: number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [subject, setSubject] = useState<GateSubject>({ kind: "general" });

  const open = useCallback(
    (nextReason: string) => {
      if (identified || !enabled) return;
      setReason(nextReason);
      setIsOpen(true);
    },
    [identified, enabled],
  );

  const close = useCallback(() => setIsOpen(false), []);

  const guard = useCallback(
    (nextReason: string, action?: () => void) => {
      if (identified || !enabled) {
        action?.();
        return true;
      }
      open(nextReason);
      return false;
    },
    [identified, enabled, open],
  );

  // Someone browsing several opportunities has shown real interest. The popup
  // never appears on arrival — the platform has to be useful first.
  useEffect(() => {
    if (identified || !enabled || subject.kind !== "opportunity") return;
    if (typeof window === "undefined") return;

    let viewed: string[] = [];
    try {
      viewed = JSON.parse(sessionStorage.getItem(VIEW_KEY) ?? "[]") as string[];
    } catch {
      viewed = [];
    }

    const id = subject.opportunityId;
    if (id && !viewed.includes(id)) {
      viewed = [...viewed, id];
      try {
        sessionStorage.setItem(VIEW_KEY, JSON.stringify(viewed.slice(-40)));
      } catch {
        // Private browsing — the counter simply does not persist.
      }
    }

    if (viewed.length >= viewsBeforePrompt) {
      const timer = setTimeout(() => open("browsed_several"), 1200);
      return () => clearTimeout(timer);
    }
  }, [identified, enabled, subject, viewsBeforePrompt, open]);

  const value = useMemo<GateValue>(
    () => ({
      identified,
      subject,
      isOpen,
      reason,
      setSubject,
      open,
      close,
      guard,
    }),
    [identified, subject, isOpen, reason, open, close, guard],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLeadGate(): GateValue {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useLeadGate must be used inside LeadGateProvider");
  }
  return value;
}

/** Declares what the current page is about. Rendered by server pages. */
export function LeadGateSubject({ subject }: { subject: GateSubject }) {
  const { setSubject } = useLeadGate();
  const key = JSON.stringify(subject);

  useEffect(() => {
    setSubject(JSON.parse(key) as GateSubject);
  }, [key, setSubject]);

  return null;
}
