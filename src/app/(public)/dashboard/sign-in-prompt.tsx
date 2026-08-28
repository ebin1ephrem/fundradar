"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestMagicLinkAction, type MagicLinkState } from "@/app/actions/auth";
import { Field, FormError } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function SignInPrompt() {
  const [state, action] = useActionState<MagicLinkState, FormData>(
    requestMagicLinkAction,
    {},
  );

  if (state.ok) {
    return (
      <div className="mx-auto max-w-[46ch] text-center">
        <p className="text-[40px] leading-none">📬</p>
        <h1 className="display-md mt-5">Check your inbox</h1>
        <p className="lede mt-3">
          If that address is on our list, a sign-in link is on its way. It works
          once and expires in 30 minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[880px] gap-10 lg:grid-cols-[1fr_380px] lg:items-center">
      <div>
        <p className="eyebrow">Your dashboard</p>
        <h1 className="display-lg mt-3 max-w-[14ch]">
          Pick up where you left off.
        </h1>
        <p className="lede mt-4 max-w-[46ch]">
          Opportunities on your Radar, the ones closing soon, and funding matched to
          what your startup is working on.
        </p>
        <p className="mt-6 text-[14px] text-muted">
          Haven&apos;t given us your details yet?{" "}
          <Link
            href="/opportunities"
            className="underline underline-offset-2 hover:text-ink"
          >
            Browse opportunities
          </Link>{" "}
          — you can start a dashboard from any of them.
        </p>
      </div>

      <form action={action} className="card grid gap-4 p-6">
        <div>
          <h2 className="text-[17px] font-medium tracking-[-0.02em]">
            Sign in with your email
          </h2>
          <p className="hint mt-1">
            No password. We send a link that signs you straight in.
          </p>
        </div>
        <FormError message={state.error} />
        <Field label="Email" htmlFor="signin-email">
          <input
            id="signin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="field"
            placeholder="you@startup.com"
          />
        </Field>
        <SubmitButton className="w-full" pendingLabel="Sending…">
          Email me a sign-in link
        </SubmitButton>
      </form>
    </div>
  );
}
