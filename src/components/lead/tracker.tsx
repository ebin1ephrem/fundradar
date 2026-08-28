"use client";

import { useEffect, useRef } from "react";

export type TrackEvent = {
  type: "opportunity_view" | "category_view" | "search" | "apply_clicked" | "unlock_requested";
  opportunityId?: string;
  categoryId?: string;
  categoryIds?: string[];
  query?: string;
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export function track(event: TrackEvent): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 120);
  }

  const payload = JSON.stringify({
    ...event,
    path: window.location.pathname,
    referrer: document.referrer || undefined,
    utm: Object.keys(utm).length ? utm : undefined,
  });

  // keepalive so the request survives the click that navigates away.
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Fires once per mount. Views are recorded from the browser because Next
 * prefetches links on hover, and counting those would inflate every number on
 * the platform.
 */
export function TrackView(event: TrackEvent) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
