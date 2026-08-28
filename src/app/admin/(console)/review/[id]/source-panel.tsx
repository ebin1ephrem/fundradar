import { ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

export type SourceMaterial = {
  origin: string;
  url: string | null;
  pageTitle: string | null;
  rawText: string | null;
  sourceName: string | null;
  createdBy: string | null;
  discoveredAt: Date;
  lastCheckedAt: Date | null;
  sourceLabel: string | null;
};

/**
 * The left half of the review screen: what we actually read. Pasted text is
 * shown verbatim — it is admin-only material and never reaches the public site.
 */
export function SourcePanel({ material }: { material: SourceMaterial | null }) {
  if (!material) {
    return (
      <div className="card p-5">
        <p className="text-[13.5px] text-muted">
          This record was entered by hand, so there is no source material to
          compare against.
        </p>
      </div>
    );
  }

  const pasted = material.origin === "PASTED_TEXT";

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-subtle px-5 py-3.5">
        <p className="eyebrow">{pasted ? "Original pasted material" : "Original source"}</p>
        <dl className="mt-2.5 grid gap-1 text-[12.5px]">
          {material.url ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">URL</dt>
              <dd className="min-w-0 text-right">
                <a
                  href={material.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 break-all underline underline-offset-2 hover:text-ink"
                >
                  {material.url}
                  <ExternalLink className="size-3 shrink-0" strokeWidth={1.7} />
                </a>
              </dd>
            </div>
          ) : null}
          {material.sourceLabel ? (
            <Row label="Monitored source" value={material.sourceLabel} />
          ) : null}
          {material.sourceName ? <Row label="Organisation" value={material.sourceName} /> : null}
          {material.pageTitle ? <Row label="Page title" value={material.pageTitle} /> : null}
          <Row label="Collected" value={formatDate(material.discoveredAt)} />
          {material.lastCheckedAt ? (
            <Row label="Last checked" value={formatDate(material.lastCheckedAt)} />
          ) : null}
          {material.createdBy ? <Row label="Added by" value={material.createdBy} /> : null}
        </dl>
      </div>

      <div className="max-h-[560px] overflow-y-auto px-5 py-4">
        {material.rawText ? (
          <pre className="font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-muted">
            {material.rawText}
          </pre>
        ) : (
          <p className="text-[13px] text-muted">No text was stored for this item.</p>
        )}
      </div>

      {material.url ? (
        <div className="border-t border-line px-5 py-3">
          <a
            href={material.url}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-secondary btn-sm"
          >
            Open the source
            <ExternalLink className="size-3.5" strokeWidth={1.7} />
          </a>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}
