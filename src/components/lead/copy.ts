import type { GateSubject } from "./gate-context";

export type GateCopy = {
  eyebrow: string | null;
  headline: string;
  body: string;
  cta: string;
};

const BENEFITS = [
  "Grants",
  "Incubation programmes",
  "CSR funding",
  "Accelerators",
  "Seed funding",
  "Startup competitions",
];

/**
 * The popup adapts to what the visitor is looking at. Every version leads with
 * what they get; none of them says "sign up", "register" or "create account".
 */
export function gateCopy(subject: GateSubject): GateCopy {
  const found =
    subject.count && subject.count > 0
      ? `We found ${subject.count} active ${
          subject.label ? `${subject.label} ` : ""
        }funding ${subject.count === 1 ? "opportunity" : "opportunities"}.`
      : null;

  switch (subject.kind) {
    case "opportunity":
      return {
        eyebrow: "Want more like this?",
        headline: "Get opportunities like this one every week",
        body: "We'll send you similar grants, programmes and funding calls as they open — plus a reminder before the deadlines you care about.",
        cta: "Send me opportunities like this",
      };

    case "founder":
      return {
        eyebrow: found,
        headline: `Don't miss funding for ${subject.label ?? "founders like you"}`,
        body: "Get the relevant grants, accelerators and startup programmes delivered as they open.",
        cta: "Send me the list",
      };

    case "category":
      return {
        eyebrow: found,
        headline: `Get new ${subject.label ?? "startup"} funding every week`,
        body: `Newly announced grants, incubation programmes and funding calls relevant to ${
          subject.label ? `${subject.label} founders` : "your startup"
        }.`,
        cta: "Send me the weekly list",
      };

    case "search":
      return {
        eyebrow: found,
        headline: "Get the full list, and new ones as they open",
        body: "We'll keep looking for opportunities that match what you searched for and send them to you weekly.",
        cta: "Send me matching opportunities",
      };

    default:
      return {
        eyebrow: null,
        headline: "Get startup funding opportunities curated for you",
        body: "Finding the right grants takes time. Tell us where to send them and we'll keep track for you.",
        cta: "Send me funding opportunities",
      };
  }
}

export { BENEFITS };
