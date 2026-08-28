import "server-only";
import type { MessageChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env, has } from "@/lib/env";

export type OutboundRequest = {
  channel: MessageChannel;
  to: string;
  template: string;
  subject?: string;
  body: string;
  leadId?: string | null;
};

/**
 * Every message is written to OutboundMessage first, then delivered if a
 * provider is configured. With no keys the platform still works end to end —
 * the outbox is a complete record of what would have been sent, which is also
 * what makes the alert pipeline testable before anyone buys a plan.
 */
export async function send(request: OutboundRequest): Promise<{ sent: boolean }> {
  const row = await prisma.outboundMessage.create({
    data: {
      channel: request.channel,
      toAddress: request.to,
      template: request.template,
      subject: request.subject ?? null,
      body: request.body,
      leadId: request.leadId ?? null,
      status: "QUEUED",
    },
  });

  try {
    if (request.channel === "EMAIL" && has.email()) {
      const id = await deliverEmail(request);
      await prisma.outboundMessage.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), provider: "resend", providerId: id },
      });
      return { sent: true };
    }

    if (request.channel === "WHATSAPP" && has.whatsapp()) {
      const id = await deliverWhatsApp(request);
      await prisma.outboundMessage.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), provider: "whatsapp", providerId: id },
      });
      return { sent: true };
    }

    await prisma.outboundMessage.update({
      where: { id: row.id },
      data: { status: "QUEUED", provider: "outbox" },
    });
    return { sent: false };
  } catch (error) {
    await prisma.outboundMessage.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      },
    });
    return { sent: false };
  }
}

async function deliverEmail(request: OutboundRequest): Promise<string | null> {
  const { Resend } = await import("resend");
  const client = new Resend(env.resendApiKey);
  const result = await client.emails.send({
    from: env.emailFrom,
    to: request.to,
    subject: request.subject ?? "FundRadar",
    text: request.body,
  });
  if (result.error) throw new Error(result.error.message);
  return result.data?.id ?? null;
}

async function deliverWhatsApp(request: OutboundRequest): Promise<string | null> {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${env.whatsappPhoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsappToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: request.to.replace(/[^\d]/g, ""),
        type: "text",
        text: { body: request.body },
      }),
    },
  );
  if (!response.ok) throw new Error(`WhatsApp API returned ${response.status}`);
  const json = (await response.json()) as { messages?: { id: string }[] };
  return json.messages?.[0]?.id ?? null;
}

/** Suppresses anything a lead has opted out of, before it reaches `send`. */
export async function sendToLead(
  leadId: string,
  request: Omit<OutboundRequest, "to" | "leadId"> & { marketing?: boolean },
): Promise<{ sent: boolean }> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { sent: false };

  const to = request.channel === "EMAIL" ? lead.email : lead.whatsapp;
  if (!to) return { sent: false };

  const consented =
    request.channel === "EMAIL"
      ? lead.emailMarketingConsent
      : lead.whatsappMarketingConsent;

  if (request.marketing !== false && (!consented || lead.unsubscribedAt)) {
    await prisma.outboundMessage.create({
      data: {
        channel: request.channel,
        toAddress: to,
        template: request.template,
        subject: request.subject ?? null,
        body: request.body,
        leadId,
        status: "SUPPRESSED",
        error: "No consent on file for this channel",
      },
    });
    return { sent: false };
  }

  return send({ ...request, to, leadId });
}
