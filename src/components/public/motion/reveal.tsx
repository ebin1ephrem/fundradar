"use client";

import {
  type CSSProperties,
  type ElementType,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

type RevealVariant = "default" | "group";

const callbacks = new WeakMap<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;

function observer(): IntersectionObserver {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callbacks.get(entry.target)?.();
        callbacks.delete(entry.target);
        sharedObserver?.unobserve(entry.target);
      }
    },
    { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
  );
  return sharedObserver;
}

export function Reveal({
  as: Component = "div",
  children,
  className,
  id,
  delay = 0,
  stagger = 90,
  variant = "default",
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  stagger?: number;
  variant?: RevealVariant;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.dataset.motionReady = "true";
    if (reduceMotion) {
      element.dataset.motionVisible = "true";
      return;
    }

    const reveal = () => {
      element.dataset.motionVisible = "true";
    };
    callbacks.set(element, reveal);
    observer().observe(element);

    return () => {
      callbacks.delete(element);
      sharedObserver?.unobserve(element);
    };
  }, []);

  return (
    <Component
      ref={ref}
      id={id}
      className={cn(
        variant === "group" ? "motion-reveal-group" : "motion-reveal",
        className,
      )}
      style={
        {
          "--motion-delay": `${delay}ms`,
          "--motion-stagger": `${stagger}ms`,
        } as CSSProperties
      }
    >
      {children}
    </Component>
  );
}
