"use client";

import { useEffect, useRef, useState } from "react";

export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;
    const run = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        run.disconnect();

        const started = performance.now();
        const duration = 1400;
        const animate = (now: number) => {
          const progress = Math.min(1, (now - started) / duration);
          const eased = 1 - Math.pow(1 - progress, 4);
          setDisplay(Math.round(value * eased));
          if (progress < 1) frame = requestAnimationFrame(animate);
        };
        setDisplay(0);
        frame = requestAnimationFrame(animate);
      },
      { threshold: 0.4 },
    );
    run.observe(element);

    return () => {
      run.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {display.toLocaleString("en-IN")}
      </span>
      <span className="sr-only">{value.toLocaleString("en-IN")}</span>
    </>
  );
}
