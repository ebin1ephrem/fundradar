"use client";

export type TrackEvent = {
  type: "apply_clicked" | "unlock_requested";
  opportunityId?: string;
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
