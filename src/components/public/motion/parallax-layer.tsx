"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function ParallaxLayer({
  children,
  className,
  distance = 18,
}: {
  children?: ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let active = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!active) return;
      const rect = element.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.innerHeight;
      const progress = Math.max(-1, Math.min(1, (viewport / 2 - rect.top) / viewport));
      element.style.transform = `translate3d(0, ${progress * distance}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const visibility = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) update();
    });
    visibility.observe(element);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      visibility.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [distance]);

  return (
    <div ref={ref} className={cn("motion-parallax", className)} aria-hidden="true">
      {children}
    </div>
  );
}
