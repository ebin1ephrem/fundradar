"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingLabel,
  className,
  variant = "primary",
  name,
  value,
  onClick,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "accent" | "secondary" | "ghost";
  name?: string;
  value?: string;
  onClick?: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      onClick={onClick}
      disabled={pending}
      className={cn("btn", `btn-${variant}`, className)}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}
