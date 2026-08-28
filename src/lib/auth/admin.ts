import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import bcrypt from "bcryptjs";
import type { AdminRole, AdminUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashToken, newToken } from "./tokens";
import { ADMIN_COOKIE } from "./cookie-names";

export { ADMIN_COOKIE };
const SESSION_DAYS = 7;

export type AdminIdentity = Pick<
  AdminUser,
  "id" | "email" | "name" | "role" | "active"
>;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 11);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createAdminSession(adminUserId: string): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const hdrs = await headers();

  await prisma.adminSession.create({
    data: {
      adminUserId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: hdrs.get("user-agent")?.slice(0, 500) ?? null,
    },
  });

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Cached per request so a page tree resolves the admin once. */
export const getAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { adminUser: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (!session.adminUser.active) return null;

  const { id, email, name, role, active } = session.adminUser;
  return { id, email, name, role, active };
});

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) {
    await prisma.adminSession
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  store.delete(ADMIN_COOKIE);
}

/**
 * Throws when there is no admin. Route-level protection also runs in
 * middleware, but every admin page and action re-checks here — the middleware
 * only sees the cookie, not whether the session is still valid.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) throw new AdminAuthError("Not signed in");
  return admin;
}

export async function requireRole(role: AdminRole): Promise<AdminIdentity> {
  const admin = await requireAdmin();
  if (role === "SUPER_ADMIN" && admin.role !== "SUPER_ADMIN") {
    throw new AdminAuthError("Super admin access required");
  }
  return admin;
}

export class AdminAuthError extends Error {}

export async function touchSessions(): Promise<void> {
  await prisma.adminSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
