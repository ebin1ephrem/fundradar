"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function MaskedReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.dataset.motionReady = "true";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.dataset.motionVisible = "true";
      return;
    }

    const reveal = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.dataset.motionVisible = "true";
        reveal.disconnect();
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    reveal.observe(element);
    return () => reveal.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={cn("motion-mask", className)}
      style={{ "--motion-delay": `${delay}ms` } as CSSProperties}
    >
      <span>{children}</span>
    </span>
  );
}
