import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { FormError, FormNotice } from "@/components/ui/form";
import { cn, formatDate } from "@/lib/utils";
import { toggleAdminActiveAction } from "./actions";
import { NewAdminForm } from "./new-admin-form";

export const metadata = { title: "Admin users" };
export const dynamic = "force-dynamic";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "SUPER_ADMIN") redirect("/admin");

  const params = await searchParams;
  const users = await prisma.adminUser.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Admin users"
        description="Who can review and publish. Deactivating someone ends their live sessions immediately."
      />
      <PageBody>
        {params.error ? (
          <div className="mb-5">
            <FormError message={params.error} />
          </div>
        ) : null}
        {params.created ? (
          <div className="mb-5">
            <FormNotice message="Admin created. Share the password over a secure channel." />
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="card overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-subtle">
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    Admin
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    Last sign-in
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[11.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                    Access
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <tr key={user.id} className={cn(!user.active && "opacity-55")}>
                    <td className="px-4 py-3">
                      <span className="block text-[13.5px] font-medium">{user.name}</span>
                      <span className="block text-[12px] text-muted">{user.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("pill", user.role === "SUPER_ADMIN" && "pill-dark")}>
                        {user.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.id === admin.id ? (
                        <span className="text-[12.5px] text-faint">You</span>
                      ) : (
                        <form action={toggleAdminActiveAction} className="inline">
                          <input type="hidden" name="id" value={user.id} />
                          <button
                            type="submit"
                            className={cn("pill", user.active ? "pill-accent" : "text-faint")}
                          >
                            {user.active ? "Active" : "Disabled"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card h-fit p-5">
            <h2 className="mb-4 text-[15px] font-medium tracking-[-0.02em]">Add an admin</h2>
            <NewAdminForm />
          </div>
        </div>
      </PageBody>
    </>
  );
}
