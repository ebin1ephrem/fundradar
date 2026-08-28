"use server";

import { z } from "zod";
import type { ErrorReportType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publiclyVisible } from "@/lib/visibility";
import { reportError as reportCopy } from "@/content/copy";

const REASONS = reportCopy.reasons.map((r) => r.value) as [
  ErrorReportType,
  ...ErrorReportType[],
];

const schema = z.object({
  slug: z.string().trim().min(1, "Pick the listing you're reporting."),
  reason: z.enum(REASONS),
  details: z.string().trim().max(2000).optional(),
  email: z.string().trim().email("That doesn't look like an email address.").max(200).optional().or(z.literal("")),
});

export type ReportState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * A founder-reported problem is stored as an ErrorReport against the listing.
 * It never edits the published record — an admin reads it and decides what,
 * if anything, changes.
 */
export async function submitReportAction(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const parsed = schema.safeParse({
    slug: formData.get("slug") ?? "",
    reason: formData.get("reason") ?? undefined,
    details: formData.get("details") ?? undefined,
    email: formData.get("email") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Please check the form and try again.", fieldErrors };
  }

  const { slug, reason, details, email } = parsed.data;

  // Only a published opportunity can be reported — a report must never become
  // a way to probe for records that are not public.
  const opportunity = await prisma.opportunity.findFirst({
    where: { slug, ...publiclyVisible },
    select: { id: true },
  });

  if (!opportunity) {
    return { error: "We couldn't find that listing. It may have been removed." };
  }

  const label =
    reportCopy.reasons.find((r) => r.value === reason)?.label ?? "Reported";

  await prisma.errorReport.create({
    data: {
      opportunityId: opportunity.id,
      type: reason,
      message: details ? `${label}. ${details}` : label,
      reporterEmail: email || null,
    },
  });

  return { ok: true };
}
