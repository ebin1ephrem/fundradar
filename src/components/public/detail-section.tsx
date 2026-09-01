import type { ReactNode } from "react";
import { Reveal } from "@/components/public/motion";

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
    <Reveal as="section" id={id} className="scroll-mt-24 border-t border-line pt-8">
      <h2 className="mb-4 text-[21px] leading-tight font-medium tracking-[-0.028em]">
        {title}
      </h2>
      {children}
    </Reveal>
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
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 gap-y-1 border-b border-line py-3 last:border-b-0 max-[340px]:grid-cols-1">
      <dt className="min-w-0 text-[13.5px] text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-[14.5px] font-medium tracking-[-0.01em] [overflow-wrap:anywhere] max-[340px]:text-left">
        {value}
      </dd>
    </div>
  );
}
