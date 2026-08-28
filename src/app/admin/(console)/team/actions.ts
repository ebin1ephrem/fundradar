"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { hashPassword, requireRole } from "@/lib/auth/admin";

const AdminInput = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  name: z.string().trim().min(2, "Name is required").max(120),
  password: z.string().min(12, "Use at least 12 characters"),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).default("ADMIN"),
});

export type TeamFormState = { error?: string };

export async function createAdminAction(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const actor = await requireRole("SUPER_ADMIN");
  const parsed = AdminInput.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role") ?? "ADMIN",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const existing = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) return { error: "An admin with that email already exists." };

  const created = await prisma.adminUser.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  await audit({
    adminUserId: actor.id,
    action: "admin.create",
    entityType: "AdminUser",
    entityId: created.id,
    summary: `Created admin ${created.email} (${created.role})`,
  });

  revalidatePath("/admin/team");
  redirect("/admin/team?created=1");
}

export async function toggleAdminActiveAction(formData: FormData) {
  const actor = await requireRole("SUPER_ADMIN");
  const id = String(formData.get("id") ?? "");
  if (id === actor.id) {
    redirect("/admin/team?error=You cannot deactivate your own account.");
  }

  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) return;

  const updated = await prisma.adminUser.update({
    where: { id },
    data: { active: !user.active },
  });

  // Revoking access means ending live sessions, not just flagging the row.
  if (!updated.active) {
    await prisma.adminSession.deleteMany({ where: { adminUserId: id } });
  }

  await audit({
    adminUserId: actor.id,
    action: updated.active ? "admin.activate" : "admin.deactivate",
    entityType: "AdminUser",
    entityId: id,
    summary: `${updated.active ? "Activated" : "Deactivated"} ${updated.email}`,
  });

  revalidatePath("/admin/team");
}
