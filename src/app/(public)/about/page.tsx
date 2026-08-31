import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { about, brand, home, seo } from "@/content/copy";
import {
  MaskedReveal,
  ParallaxLayer,
  Reveal,
} from "@/components/public/motion";

export const metadata: Metadata = {
  title: seo.about.title,
  description: seo.about.description,
  alternates: { canonical: "/about" },
  openGraph: {
    title: seo.about.title,
    description: seo.about.description,
    url: "/about",
    siteName: brand.lockup,
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="dot-grid pointer-events-none absolute inset-0 opacity-[0.55]"
          aria-hidden="true"
        />
        <div className="page-shell relative py-16 lg:py-24">
          <Reveal as="p" className="eyebrow">{brand.lockup}</Reveal>
          <h1 className="display-xl mt-4 max-w-[20ch]">
            <MaskedReveal delay={80}>{about.hero.headline}</MaskedReveal>
          </h1>
          <Reveal className="mt-6 grid max-w-[58ch] gap-4" delay={180}>
            {about.hero.body.map((line) => (
              <p key={line} className="lede">
                {line}
              </p>
            ))}
          </Reveal>
        </div>
      </section>

      <Prose section={about.why} />
      <Prose section={about.merstra} tinted />
      <Prose section={about.job} />

      {/* The promise -------------------------------------------------- */}
      <section className="section-y border-t border-line bg-subtle">
        <div className="page-shell">
          <Reveal as="p" className="eyebrow">{about.promise.eyebrow}</Reveal>
          <Reveal variant="group" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" stagger={80}>
            {about.promise.items.map((item) => (
              <div
                key={item.title}
                className="how-step rounded-[12px] border border-line bg-canvas p-5"
              >
                <p className="text-[15.5px] font-medium tracking-[-0.02em]">
                  {item.title}
                </p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                  {item.body}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <Prose section={about.not} />

      {/* How it works ------------------------------------------------- */}
      <section id="how-it-works" className="section-y border-t border-line">
        <div className="page-shell">
          <Reveal>
            <p className="eyebrow">{home.howItWorks.eyebrow}</p>
            <h2 className="display-lg mt-2.5 max-w-[16ch]">
              {home.howItWorks.headline}
            </h2>
          </Reveal>
          <Reveal as="ol" variant="group" stagger={80} className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {home.howItWorks.steps.map((step, i) => (
              <li key={step.title} className="how-step rounded-[12px] border border-line p-5">
                <span className="how-step-number font-display text-[13px] font-medium tabular-nums text-muted transition-colors duration-200">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-[15.5px] font-medium tracking-[-0.02em]">
                  {step.title}
                </p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Trust -------------------------------------------------------- */}
      <section className="pb-16">
        <div className="page-shell-wide">
          <Reveal className="on-dark panel-dark relative overflow-hidden px-6 py-14 lg:px-16 lg:py-20">
            <ParallaxLayer className="dot-grid-dark pointer-events-none absolute -inset-y-8 inset-x-0 opacity-40" distance={18} />
            <div className="relative max-w-[62ch]">
              <h2 className="display-lg max-w-[18ch] text-on-dark">
                {about.trust.headline}
              </h2>
              {about.trust.body.map((line) => (
                <p
                  key={line}
                  className="mt-4 text-[15px] leading-relaxed text-on-dark-muted"
                >
                  {line}
                </p>
              ))}
              <Link href="/opportunities" className="btn btn-accent mt-8">
                {about.trust.cta}
                <ArrowRight className="motion-arrow size-4" strokeWidth={1.8} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function Prose({
  section,
  tinted = false,
}: {
  section: {
    eyebrow: string;
    headline: string;
    body: readonly string[];
  };
  tinted?: boolean;
}) {
  return (
    <section
      className={`section-y border-t border-line${tinted ? " bg-subtle" : ""}`}
    >
      <Reveal className="page-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="eyebrow">{section.eyebrow}</p>
          <h2 className="display-md mt-2.5 max-w-[18ch]">{section.headline}</h2>
        </div>
        <div className="grid max-w-[62ch] gap-4">
          {section.body.map((line) => (
            <p key={line} className="text-[15.5px] leading-relaxed text-muted">
              {line}
            </p>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
