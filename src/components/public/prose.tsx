import { cn } from "@/lib/utils";

/**
 * Provider text arrives as plain text with line breaks — bullet-ish lines,
 * paragraphs. Rendered structurally rather than as raw HTML, so nothing from a
 * source page can inject markup into our page.
 */
export function ProviderText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  if (!text?.trim()) return null;

  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className={cn("grid gap-3.5 text-[15px] leading-[1.65] text-muted", className)}>
      {blocks.map((block, i) => {
        const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
        const bulleted =
          lines.length > 1 && lines.every((l) => /^([-•*–]|\d+[.)])\s+/.test(l));

        if (bulleted) {
          return (
            <ul key={i} className="grid gap-2">
              {lines.map((line, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="mt-[9px] size-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span>{line.replace(/^([-•*–]|\d+[.)])\s+/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}
