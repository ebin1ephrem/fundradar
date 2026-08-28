"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { createAdminSession, verifyPassword } from "@/lib/auth/admin";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

const MAX_FAILURES = 8;
const WINDOW_MINUTES = 15;

async function recentFailures(email: string): Promise<number> {
  return prisma.auditLog.count({
    where: {
      action: "admin.login_failed",
      entityId: email,
      createdAt: { gt: new Date(Date.now() - WINDOW_MINUTES * 60_000) },
    },
  });
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details" };
  }

  const { email, password, next } = parsed.data;

  if ((await recentFailures(email)) >= MAX_FAILURES) {
    return {
      error: `Too many failed attempts. Try again in ${WINDOW_MINUTES} minutes.`,
    };
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  const ok = user?.active
    ? await verifyPassword(password, user.passwordHash)
    : false;

  if (!user || !ok) {
    await audit({
      action: "admin.login_failed",
      entityType: "AdminUser",
      entityId: email,
      summary: "Failed sign-in attempt",
    });
    // Deliberately identical for unknown email, wrong password and disabled account.
    return { error: "Email or password is incorrect." };
  }

  await createAdminSession(user.id);
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await audit({
    adminUserId: user.id,
    action: "admin.login",
    entityType: "AdminUser",
    entityId: user.id,
    summary: `${user.email} signed in`,
  });

  const target = next && next.startsWith("/admin") ? next : "/admin";
  redirect(target);
}
