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
  name: string | null;
  subject: GateSubject;
  isOpen: boolean;
  /** The action the visitor was trying to take, used as the capture source. */
  reason: string | null;
  setSubject: (subject: GateSubject) => void;
  open: (reason: string) => void;
  close: () => void;
  refreshSession: () => Promise<void>;
  isSaved: (opportunityId: string) => boolean;
  setSaved: (opportunityId: string, saved: boolean) => void;
  /**
   * Runs `action` when the visitor is already known, and opens the popup when
   * they are not. Every gated control goes through this.
   */
  guard: (reason: string, action?: () => void) => boolean;
};

const Ctx = createContext<GateValue | null>(null);

const VIEW_KEY = "fr_views";
const LEAD_HINT = "fr_identified=1";
const SESSION_CHECK_KEY = "fr:session-checked:v1";

function hasLeadHint(): boolean {
  return typeof document !== "undefined" && document.cookie
    .split(";")
    .some((cookie) => cookie.trim() === LEAD_HINT);
}

export function LeadGateProvider({
  enabled,
  viewsBeforePrompt,
  children,
}: {
  enabled: boolean;
  viewsBeforePrompt: number;
  children: React.ReactNode;
}) {
  const [identified, setIdentified] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [subject, setSubject] = useState<GateSubject>({ kind: "general" });

  const refreshSession = useCallback(async () => {
    // Almost all public visitors are anonymous. Avoid turning each CDN-served
    // page into a serverless invocation just to rediscover that fact. Browsers
    // that pre-date the hint cookie get one compatibility lookup, ever.
    if (!hasLeadHint()) {
      try {
        if (localStorage.getItem(SESSION_CHECK_KEY)) return;
        localStorage.setItem(SESSION_CHECK_KEY, "1");
      } catch {
        return;
      }
    }
    try {
      const response = await fetch("/api/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const session = (await response.json()) as {
        identified: boolean;
        name: string | null;
        savedOpportunityIds: string[];
      };
      setIdentified(session.identified);
      setName(session.name);
      setSavedIds(new Set(session.savedOpportunityIds));
      if (!session.identified) {
        document.cookie = "fr_identified=; Max-Age=0; Path=/; SameSite=Lax";
      }
    } catch {
      // Personalisation is progressive enhancement. Shared catalogue HTML
      // remains usable when the session endpoint is unavailable.
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const isSaved = useCallback(
    (opportunityId: string) => savedIds.has(opportunityId),
    [savedIds],
  );

  const setSaved = useCallback((opportunityId: string, saved: boolean) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (saved) next.add(opportunityId);
      else next.delete(opportunityId);
      return next;
    });
  }, []);

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
      name,
      subject,
      isOpen,
      reason,
      setSubject,
      open,
      close,
      refreshSession,
      isSaved,
      setSaved,
      guard,
    }),
    [
      identified,
      name,
      subject,
      isOpen,
      reason,
      open,
      close,
      refreshSession,
      isSaved,
      setSaved,
      guard,
    ],
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
