import type { ReactNode } from "react";

export function DetailSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-8">
      <h2 className="mb-4 text-[21px] leading-tight font-medium tracking-[-0.028em]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function FactRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-3 last:border-b-0">
      <dt className="text-[13.5px] text-muted">{label}</dt>
      <dd className="text-right text-[14.5px] font-medium tracking-[-0.01em]">
        {value}
      </dd>
    </div>
  );
}
