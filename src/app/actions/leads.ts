"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  endLeadSession,
  getViewer,
  linkVisitorToLead,
  startLeadSession,
} from "@/lib/leads/identity";
import { recordActivity, noteInterest } from "@/lib/leads/activity";
import { refreshLead } from "@/lib/leads/scoring";
import { sendToLead } from "@/lib/messaging";
import { env } from "@/lib/env";

export type LeadCaptureState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const CaptureSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter an email we can reach you at")
    .max(180),
  whatsapp: z
    .string()
    .trim()
    .min(7, "Enter a number we can send deadline alerts to")
    .max(24)
    .regex(/^[+\d][\d\s().-]{6,23}$/, "Enter a valid phone number"),
  startupName: z
    .string()
    .trim()
    .max(160)
    .transform((v) => (v.length ? v : null))
    .nullable(),
  source: z.string().trim().max(80).optional(),
  categoryIds: z.array(z.string().max(40)).max(12).optional(),
  opportunityId: z.string().max(40).optional(),
  path: z.string().max(300).optional(),
});

/**
 * One step, four fields, and the visitor stays exactly where they were.
 *
 * Submitting is itself the consent act: the form states, in plain sight, that
 * we will send relevant funding opportunities and deadline alerts. The two
 * channels are stored separately so either can be withdrawn on its own, and
 * every message checks them before going out.
 */
export async function captureLeadAction(
  _prev: LeadCaptureState,
  formData: FormData,
): Promise<LeadCaptureState> {
  const parsed = CaptureSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    whatsapp: formData.get("whatsapp"),
    startupName: formData.get("startupName") ?? "",
    source: formData.get("source") ?? undefined,
    categoryIds: formData.getAll("categoryIds").map(String).filter(Boolean),
    opportunityId: formData.get("opportunityId")
      ? String(formData.get("opportunityId"))
      : undefined,
    path: formData.get("path") ? String(formData.get("path")) : undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] ??= issue.message;
    }
    return { error: "Check the highlighted fields.", fieldErrors };
  }

  const input = parsed.data;
  const viewer = await getViewer();
  const now = new Date();

  const visitor = viewer.anonId
    ? await prisma.visitor.findUnique({ where: { anonId: viewer.anonId } })
    : null;

  const existing = await prisma.lead.findUnique({ where: { email: input.email } });

  const lead = existing
    ? await prisma.lead.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          whatsapp: input.whatsapp,
          startupName: input.startupName ?? existing.startupName,
          lastVisitAt: now,
          lastActivityAt: now,
          emailMarketingConsent: true,
          whatsappMarketingConsent: true,
          consentTimestamp: existing.consentTimestamp ?? now,
          consentSource: existing.consentSource ?? (input.source ?? "lead_popup"),
          unsubscribedAt: null,
        },
      })
    : await prisma.lead.create({
        data: {
          name: input.name,
          email: input.email,
          whatsapp: input.whatsapp,
          startupName: input.startupName,
          emailMarketingConsent: true,
          whatsappMarketingConsent: true,
          consentTimestamp: now,
          consentSource: input.source ?? "lead_popup",
          leadSource: input.source ?? "lead_popup",
          landingPath: visitor?.landingPath ?? input.path ?? null,
          referrer: visitor?.referrer ?? null,
          utmSource: visitor?.utmSource ?? null,
          utmMedium: visitor?.utmMedium ?? null,
          utmCampaign: visitor?.utmCampaign ?? null,
          utmTerm: visitor?.utmTerm ?? null,
          utmContent: visitor?.utmContent ?? null,
          firstVisitAt: visitor?.firstSeenAt ?? now,
        },
      });

  await linkVisitorToLead(viewer.anonId, lead.id);
  await startLeadSession(lead.id);

  // The weekly digest starts pre-tuned to whatever they were browsing.
  const interestIds = input.categoryIds ?? [];
  await noteInterest(lead.id, interestIds, "lead_capture");
  await ensureDigestSubscription(lead.id, interestIds);

  await recordActivity({
    type: "lead_captured",
    leadId: lead.id,
    visitorId: visitor?.id ?? null,
    description: `Gave their details via ${input.source ?? "the funding popup"}`,
    opportunityId: input.opportunityId ?? null,
    metadata: { source: input.source ?? null, path: input.path ?? null },
  });

  if (input.opportunityId) {
    await recordActivity({
      type: "opportunity_unlocked",
      leadId: lead.id,
      opportunityId: input.opportunityId,
    });
    await prisma.opportunity
      .update({
        where: { id: input.opportunityId },
        data: { unlockCount: { increment: 1 } },
      })
      .catch(() => undefined);
  }

  await refreshLead(lead.id);
  await sendWelcome(lead.id, input.name);

  if (input.path) revalidatePath(input.path);
  revalidatePath("/dashboard");

  return { ok: true };
}

async function ensureDigestSubscription(leadId: string, categoryIds: string[]) {
  const subscription = await prisma.alertSubscription.upsert({
    where: {
      leadId_frequency_channel: {
        leadId,
        frequency: "WEEKLY_DIGEST",
        channel: "EMAIL",
      },
    },
    update: { active: true },
    create: { leadId, frequency: "WEEKLY_DIGEST", channel: "EMAIL", active: true },
  });

  if (categoryIds.length === 0) return;
  await prisma.$transaction(
    categoryIds.map((categoryId) =>
      prisma.alertSubscriptionCategory.upsert({
        where: {
          subscriptionId_categoryId: {
            subscriptionId: subscription.id,
            categoryId,
          },
        },
        update: {},
        create: { subscriptionId: subscription.id, categoryId },
      }),
    ),
  );
}

async function sendWelcome(leadId: string, name: string) {
  await sendToLead(leadId, {
    channel: "EMAIL",
    template: "welcome",
    subject: "You're in — your weekly funding list starts this week",
    body: [
      `Hi ${name.split(" ")[0]},`,
      "",
      "You'll get newly announced grants, incubation programmes, accelerators and",
      "competitions once a week, plus a nudge before the deadlines that matter to you.",
      "",
      `Browse everything here: ${env.appUrl}/opportunities`,
      `Change what you hear about, or stop entirely: ${env.appUrl}/dashboard/alerts`,
      "",
      "— FundRadar",
    ].join("\n"),
  });
}

/** Actions that need someone identified; returns null when they are not. */
async function currentLeadId(): Promise<string | null> {
  const { lead } = await getViewer();
  return lead?.id ?? null;
}

export async function toggleSaveAction(formData: FormData) {
  const leadId = await currentLeadId();
  const opportunityId = String(formData.get("opportunityId") ?? "");
  if (!leadId || !opportunityId) return;

  const existing = await prisma.savedOpportunity.findUnique({
    where: { leadId_opportunityId: { leadId, opportunityId } },
  });

  if (existing) {
    await prisma.savedOpportunity.delete({ where: { id: existing.id } });
    await prisma.opportunity
      .update({ where: { id: opportunityId }, data: { saveCount: { decrement: 1 } } })
      .catch(() => undefined);
    await recordActivity({ type: "opportunity_unsaved", leadId, opportunityId });
  } else {
    await prisma.savedOpportunity.create({ data: { leadId, opportunityId } });
    await prisma.opportunity
      .update({ where: { id: opportunityId }, data: { saveCount: { increment: 1 } } })
      .catch(() => undefined);
    await recordActivity({ type: "opportunity_saved", leadId, opportunityId });
  }

  await refreshLead(leadId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/saved");
}

export async function requestReminderAction(formData: FormData) {
  const leadId = await currentLeadId();
  const opportunityId = String(formData.get("opportunityId") ?? "");
  if (!leadId || !opportunityId) return;

  await prisma.alertSubscription.upsert({
    where: {
      leadId_frequency_channel: {
        leadId,
        frequency: "DEADLINE_REMINDER",
        channel: "EMAIL",
      },
    },
    update: { active: true },
    create: {
      leadId,
      frequency: "DEADLINE_REMINDER",
      channel: "EMAIL",
      active: true,
    },
  });

  await prisma.savedOpportunity
    .upsert({
      where: { leadId_opportunityId: { leadId, opportunityId } },
      update: {},
      create: { leadId, opportunityId, status: "INTERESTED" },
    })
    .catch(() => undefined);

  await recordActivity({ type: "reminder_requested", leadId, opportunityId });
  await refreshLead(leadId);
  revalidatePath("/dashboard");
}

export async function signOutLeadAction() {
  await endLeadSession();
  revalidatePath("/dashboard");
}

const ProfileSchema = z.object({
  startupName: z.string().trim().max(160).optional(),
  website: z.string().trim().max(200).optional(),
  linkedinUrl: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  industryCategoryId: z.string().trim().max(40).optional(),
  stageCategoryId: z.string().trim().max(40).optional(),
  founderTypeCategoryId: z.string().trim().max(40).optional(),
  yearFounded: z.coerce.number().int().min(1900).max(2100).optional(),
  teamSize: z.string().trim().max(40).optional(),
  revenueRange: z.string().trim().max(60).optional(),
  fundingRaised: z.string().trim().max(60).optional(),
  fundingRequirementMin: z.coerce.number().min(0).optional(),
  fundingRequirementMax: z.coerce.number().min(0).optional(),
  dpiitStatus: z.enum(["yes", "no", "unknown"]).optional(),
  udyamStatus: z.enum(["yes", "no", "unknown"]).optional(),
});

export type ProfileState = { ok?: boolean; error?: string };

/**
 * Progressive profiling. Every field is optional and saved independently, so a
 * founder can answer one question now and another next week.
 */
export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { lead } = await getViewer();
  if (!lead) return { error: "Your session has expired. Sign in again to continue." };

  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    const text = String(value).trim();
    if (text.length) raw[key] = text;
  }

  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details you entered." };
  }

  const input = parsed.data;
  const tri = (v?: string) => (v === "unknown" || v === undefined ? null : v === "yes");

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      startupName: input.startupName ?? lead.startupName,
      website: input.website ?? lead.website,
      linkedinUrl: input.linkedinUrl ?? lead.linkedinUrl,
      city: input.city ?? lead.city,
      state: input.state ?? lead.state,
      country: input.country ?? lead.country,
      industryCategoryId: input.industryCategoryId ?? lead.industryCategoryId,
      stageCategoryId: input.stageCategoryId ?? lead.stageCategoryId,
      founderTypeCategoryId: input.founderTypeCategoryId ?? lead.founderTypeCategoryId,
      yearFounded: input.yearFounded ?? lead.yearFounded,
      teamSize: input.teamSize ?? lead.teamSize,
      revenueRange: input.revenueRange ?? lead.revenueRange,
      fundingRaised: input.fundingRaised ?? lead.fundingRaised,
      fundingRequirementMin: input.fundingRequirementMin ?? lead.fundingRequirementMin,
      fundingRequirementMax: input.fundingRequirementMax ?? lead.fundingRequirementMax,
      dpiitStatus: input.dpiitStatus ? tri(input.dpiitStatus) : lead.dpiitStatus,
      udyamStatus: input.udyamStatus ? tri(input.udyamStatus) : lead.udyamStatus,
    },
  });

  const interests = [input.industryCategoryId, input.stageCategoryId].filter(
    (v): v is string => Boolean(v),
  );
  await noteInterest(lead.id, interests, "profile");

  await recordActivity({
    type: "profile_updated",
    leadId: lead.id,
    description: `Added ${Object.keys(input).length} profile ${
      Object.keys(input).length === 1 ? "detail" : "details"
    }`,
  });
  await refreshLead(lead.id);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

export async function updateSavedStatusAction(formData: FormData) {
  const { lead } = await getViewer();
  if (!lead) return;

  const id = String(formData.get("savedId") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const allowed = ["SAVED", "APPLIED", "INTERESTED", "NOT_RELEVANT"];
  if (!id || !allowed.includes(status)) return;

  const row = await prisma.savedOpportunity.findFirst({
    where: { id, leadId: lead.id },
  });
  if (!row) return;

  await prisma.savedOpportunity.update({
    where: { id },
    data: {
      status: status as "SAVED" | "APPLIED" | "INTERESTED" | "NOT_RELEVANT",
      notes: notes.length ? notes.slice(0, 2000) : null,
    },
  });

  await recordActivity({
    type: "saved_status_changed",
    leadId: lead.id,
    opportunityId: row.opportunityId,
    description: `Marked a saved opportunity as ${status.toLowerCase().replace("_", " ")}`,
  });

  revalidatePath("/dashboard/saved");
}

export type AlertsState = { ok?: boolean; error?: string };

export async function updateAlertsAction(
  _prev: AlertsState,
  formData: FormData,
): Promise<AlertsState> {
  const { lead } = await getViewer();
  if (!lead) return { error: "Your session has expired. Sign in again to continue." };

  const weekly = formData.get("weekly") === "on";
  const reminders = formData.get("reminders") === "on";
  const whatsapp = formData.get("whatsappAlerts") === "on";
  const emailConsent = formData.get("emailConsent") === "on";
  const whatsappConsent = formData.get("whatsappConsent") === "on";
  const categoryIds = formData.getAll("categoryIds").map(String).filter(Boolean);

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      emailMarketingConsent: emailConsent,
      whatsappMarketingConsent: whatsappConsent,
      unsubscribedAt: emailConsent || whatsappConsent ? null : new Date(),
    },
  });

  await setSubscription(lead.id, "WEEKLY_DIGEST", "EMAIL", weekly, categoryIds);
  await setSubscription(lead.id, "DEADLINE_REMINDER", "EMAIL", reminders, []);
  await setSubscription(lead.id, "DEADLINE_REMINDER", "WHATSAPP", whatsapp, []);

  await recordActivity({
    type: "alerts_updated",
    leadId: lead.id,
    description: "Updated their alert preferences",
  });
  await refreshLead(lead.id);

  revalidatePath("/dashboard/alerts");
  return { ok: true };
}

async function setSubscription(
  leadId: string,
  frequency: "WEEKLY_DIGEST" | "DEADLINE_REMINDER" | "IMMEDIATE",
  channel: "EMAIL" | "WHATSAPP",
  active: boolean,
  categoryIds: string[],
) {
  const subscription = await prisma.alertSubscription.upsert({
    where: { leadId_frequency_channel: { leadId, frequency, channel } },
    update: { active },
    create: { leadId, frequency, channel, active },
  });

  if (frequency !== "WEEKLY_DIGEST") return;

  await prisma.alertSubscriptionCategory.deleteMany({
    where: { subscriptionId: subscription.id, categoryId: { notIn: categoryIds } },
  });
  if (categoryIds.length === 0) return;
  await prisma.$transaction(
    categoryIds.map((categoryId) =>
      prisma.alertSubscriptionCategory.upsert({
        where: {
          subscriptionId_categoryId: { subscriptionId: subscription.id, categoryId },
        },
        update: {},
        create: { subscriptionId: subscription.id, categoryId },
      }),
    ),
  );
}
