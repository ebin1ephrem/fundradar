"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

type NavigatorWithMobileHint = Navigator & {
  userAgentData?: { mobile?: boolean };
};

function isMobileDevice() {
  const navigatorWithHint = navigator as NavigatorWithMobileHint;
  return (
    navigatorWithHint.userAgentData?.mobile === true ||
    /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

export function ShareButton({
  title,
  text,
  canonicalUrl,
  canonicalPath,
  variant = "icon",
}: {
  title: string;
  text: string;
  canonicalUrl: string;
  canonicalPath: string;
  variant?: "icon" | "full";
}) {
  const [copied, setCopied] = useState(false);

  function getOpportunityUrl() {
    try {
      const configuredUrl = new URL(canonicalUrl);

      if (
        configuredUrl.hostname === "localhost" &&
        configuredUrl.origin !== window.location.origin
      ) {
        return new URL(canonicalPath, window.location.origin).toString();
      }

      return configuredUrl.toString();
    } catch {
      return new URL(canonicalPath, window.location.origin).toString();
    }
  }

  async function shareOpportunity() {
    const url = getOpportunityUrl();

    if (isMobileDevice()) {
      const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`;
      window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={shareOpportunity}
      aria-label={copied ? "Opportunity link copied" : "Share this opportunity"}
      className={
        variant === "full"
          ? "btn btn-secondary min-h-11 w-full"
          : "grid size-8 place-items-center self-center rounded-[6px] border border-line text-faint transition-colors duration-200 hover:border-line-strong hover:text-ink"
      }
    >
      <Share2 className="size-4" strokeWidth={1.6} />
      {variant === "full" ? (copied ? "Copied" : "Share") : null}
    </button>
  );
}
