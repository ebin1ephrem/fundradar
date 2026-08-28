import { cn } from "@/lib/utils";

/**
 * The spec's bands: 90%+ is high, 70–89% wants a look, below 70% needs
 * verifying. These are shown to admins only — never on the public site.
 */
export function confidenceBand(confidence: number | null | undefined): {
  label: string;
  tone: string;
  needsCheck: boolean;
} {
  if (confidence === null || confidence === undefined) {
    return { label: "Not scored", tone: "text-faint", needsCheck: false };
  }
  const pct = confidence * 100;
  if (pct >= 90) return { label: "High", tone: "text-ok", needsCheck: false };
  if (pct >= 70) return { label: "Check", tone: "text-warn", needsCheck: true };
  return { label: "Verify", tone: "text-danger", needsCheck: true };
}

export function ConfidenceDot({
  confidence,
  showLabel,
}: {
  confidence: number | null | undefined;
  showLabel?: boolean;
}) {
  const band = confidenceBand(confidence);
  if (confidence === null || confidence === undefined) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[11.5px]", band.tone)}
      title={`${Math.round(confidence * 100)}% confidence — ${band.label.toLowerCase()}`}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          band.needsCheck ? "bg-current" : "bg-ok",
        )}
        aria-hidden="true"
      />
      {showLabel ? `${Math.round(confidence * 100)}%` : null}
    </span>
  );
}
