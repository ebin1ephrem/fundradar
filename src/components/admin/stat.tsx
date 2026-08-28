import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  href,
  emphasis,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  emphasis?: boolean;
}) {
  const body = (
    <>
      <p className="text-[11.5px] font-semibold tracking-[0.07em] text-muted uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-[30px] leading-none font-medium tracking-[-0.035em] tabular-nums",
          emphasis && Number(value) > 0 && "text-ink",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[12.5px] text-muted">{hint}</p> : null}
      {emphasis && Number(value) > 0 ? (
        <span className="mt-3 block h-[3px] w-9 rounded-full bg-accent" />
      ) : null}
    </>
  );

  const className =
    "block rounded-[12px] border border-line bg-canvas p-5 transition-colors duration-200";

  return href ? (
    <Link href={href} className={cn(className, "hover:border-line-strong")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
