import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="text-muted"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-[12.5px] text-danger">{error}</p>
      ) : hint ? (
        <p className="hint mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-[8px] border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13.5px] text-danger"
    >
      {message}
    </div>
  );
}

export function FormNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-[8px] border border-line bg-subtle px-3.5 py-2.5 text-[13.5px] text-body">
      {message}
    </div>
  );
}

export function Fieldset({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line pt-7">
      <div className="mb-5">
        <h2 className="text-[17px] font-medium tracking-[-0.02em]">{title}</h2>
        {description ? <p className="hint mt-1">{description}</p> : null}
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

export function Row({
  cols = 2,
  children,
}: {
  cols?: 2 | 3 | 4;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-5",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

export function Checkbox({
  name,
  value,
  label,
  defaultChecked,
  description,
}: {
  name: string;
  value?: string;
  label: string;
  defaultChecked?: boolean;
  description?: string;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-2.5 rounded-[8px] border border-line bg-canvas px-3 py-2.5 transition-colors duration-200 hover:border-line-strong hover:bg-subtle has-checked:border-ink has-checked:bg-subtle">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 accent-ink"
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] leading-tight">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[12px] text-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
