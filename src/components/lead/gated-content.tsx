"use client";

import type { ReactNode } from "react";
import { useLeadGate } from "./gate-context";

/**
 * Keeps opportunity HTML shared and CDN-cacheable while preserving the lead
 * gate in the browser. The hint/session lookup can reveal it without forcing
 * the page itself to read cookies or render dynamically.
 */
export function GatedContent({
  locked,
  fallback = null,
  children,
}: {
  locked: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { identified } = useLeadGate();
  return locked && !identified ? fallback : children;
}
