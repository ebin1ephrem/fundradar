import { redirect } from "next/navigation";
import { getViewer } from "@/lib/leads/identity";
import { SignInPrompt } from "../dashboard/sign-in-prompt";
import { FormError } from "@/components/ui/form";

export const metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  expired: "That link has expired or has already been used. Here is a fresh one.",
  missing: "That link was incomplete. Enter your email and we will send another.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { lead } = await getViewer();
  if (lead) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="page-shell section-y">
      {error ? (
        <div className="mx-auto mb-8 max-w-[880px]">
          <FormError message={MESSAGES[error] ?? MESSAGES.expired} />
        </div>
      ) : null}
      <SignInPrompt />
    </div>
  );
}
