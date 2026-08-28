import type { GateSubject } from "./gate-context";
import { leadCapture } from "@/content/copy";

export type GateCopy = {
  eyebrow: string | null;
  headline: string;
  body: string;
  cta: string;
};

const BENEFITS = [...leadCapture.general.bullets];

/**
 * The popup adapts to what the visitor is looking at (content spec, Part 7).
 * Every version leads with what they get; none of them says "sign up",
 * "register" or "create account".
 */
export function gateCopy(subject: GateSubject): GateCopy {
  // Version 4 — the micro-reward shown above the form when we can count.
  const found =
    subject.count && subject.count > 0
      ? leadCapture.microReward(
          subject.count,
          subject.label ?? "funding",
        ).headline
      : null;

  switch (subject.kind) {
    // Version 3 — after viewing an opportunity.
    case "opportunity":
      return {
        eyebrow: null,
        headline: leadCapture.afterViewing.headline,
        body: leadCapture.afterViewing.body,
        cta: leadCapture.afterViewing.cta,
      };

    // Version 2 — contextual, founder-category flavour.
    case "founder": {
      const c = leadCapture.contextual(subject.label ?? "startup");
      return {
        eyebrow: found,
        headline: subject.label
          ? `Funding opportunities for ${subject.label.toLowerCase()}.`
          : c.headline,
        body: c.body,
        cta: c.cta,
      };
    }

    // Version 2 — contextual, category.
    case "category": {
      const c = leadCapture.contextual(subject.label ?? "startup");
      return { eyebrow: found, headline: c.headline, body: c.body, cta: c.cta };
    }

    // Version 4 — micro-reward on a search that already returned results.
    case "search": {
      const m = leadCapture.microReward(
        subject.count ?? 0,
        subject.label ?? "matching",
      );
      return {
        eyebrow: found,
        headline: found ? m.body : leadCapture.general.headline,
        body: leadCapture.general.body,
        cta: found ? m.cta : leadCapture.general.cta,
      };
    }

    // Version 1 — general.
    default:
      return {
        eyebrow: null,
        headline: leadCapture.general.headline,
        body: leadCapture.general.body,
        cta: leadCapture.general.cta,
      };
  }
}

export { BENEFITS };
