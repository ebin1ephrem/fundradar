"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken, newToken } from "@/lib/auth/tokens";
import { send } from "@/lib/messaging";
import { env } from "@/lib/env";

const TOKEN_MINUTES = 30;
const MAX_REQUESTS_PER_HOUR = 5;

export type MagicLinkState = { ok?: boolean; error?: string };

const Schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter the email you signed up with"),
});

/**
 * No passwords on the public side. The response is deliberately identical
 * whether or not the address is known, so this cannot be used to discover who
 * is on the platform.
 */
export async function requestMagicLinkAction(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = Schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address" };
  }

  const { email } = parsed.data;
  const lead = await prisma.lead.findUnique({ where: { email } });

  if (lead) {
    const recent = await prisma.loginToken.count({
      where: {
        leadId: lead.id,
        createdAt: { gt: new Date(Date.now() - 3_600_000) },
      },
    });

    if (recent < MAX_REQUESTS_PER_HOUR) {
      const token = newToken();
      await prisma.loginToken.create({
        data: {
          leadId: lead.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + TOKEN_MINUTES * 60_000),
        },
      });

      const link = `${env.appUrl}/auth/verify?token=${token}`;
      await send({
        channel: "EMAIL",
        to: lead.email,
        leadId: lead.id,
        template: "magic_link",
        subject: "Your FundRadar sign-in link",
        body: [
          `Hi ${lead.name.split(" ")[0]},`,
          "",
          "Here is your sign-in link. It works once and expires in 30 minutes.",
          "",
          link,
          "",
          "If you did not ask for this, you can ignore it.",
          "",
          "— FundRadar",
        ].join("\n"),
      });

      if (env.nodeEnv !== "production") {
        console.log(`[dev] magic link for ${lead.email}: ${link}`);
      }
    }
  }

  return { ok: true };
}
