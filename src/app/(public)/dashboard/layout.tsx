import Link from "next/link";
import { getViewer } from "@/lib/leads/identity";
import { SignInPrompt } from "./sign-in-prompt";
import { DashboardNav } from "./nav";

export const metadata = { title: "Your dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lead } = await getViewer();

  if (!lead) {
    return (
      <div className="page-shell section-y">
        <SignInPrompt />
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-line">
        <div className="page-shell pt-10 pb-0 lg:pt-14">
          <p className="eyebrow">Your funding dashboard</p>
          <h1 className="display-md mt-2.5 max-w-[20ch]">
            {lead.startupName ?? lead.name.split(" ")[0]}
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            {lead.email}
            {lead.profileCompletion < 100 ? (
              <>
                {" · "}
                <Link
                  href="/dashboard/profile"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Profile {lead.profileCompletion}% complete
                </Link>
              </>
            ) : null}
          </p>
          <DashboardNav />
        </div>
      </div>
      <div className="page-shell py-9 lg:py-12">{children}</div>
    </>
  );
}
