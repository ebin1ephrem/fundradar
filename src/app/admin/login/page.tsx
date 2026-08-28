import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth/admin";
import { LoginForm } from "./login-form";

export const metadata = { title: "Admin sign in", robots: { index: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await getAdmin()) redirect(next?.startsWith("/admin") ? next : "/admin");

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_44%]">
      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-[380px]">
          <Link
            href="/"
            className="mb-11 inline-flex items-center gap-2 text-[15px] font-medium tracking-[-0.02em]"
          >
            <span className="grid size-7 place-items-center rounded-[6px] bg-ink text-accent">
              <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="8" cy="8" r="2" fill="currentColor" />
              </svg>
            </span>
            FundRadar
          </Link>

          <h1 className="text-[30px] leading-[1.1] font-medium tracking-[-0.035em]">
            Admin sign in
          </h1>
          <p className="hint mt-2">
            The publishing console for the funding database.
          </p>

          <div className="mt-8">
            <LoginForm next={next} />
          </div>
        </div>
      </div>

      <aside className="on-dark hidden bg-ink p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="dot-grid-dark h-24 rounded-[12px] opacity-40" />
        <div>
          <p className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em] text-on-dark">
            Automation collects and prepares. People decide what becomes public.
          </p>
          <p className="mt-4 max-w-[38ch] text-[14px] leading-relaxed text-on-dark-muted">
            Crawling, extraction, classification and change detection all run on
            their own. Nothing reaches the public database without an admin
            approving it.
          </p>
        </div>
        <p className="text-[12px] tracking-[0.06em] text-on-dark-faint uppercase">
          FundRadar console
        </p>
      </aside>
    </main>
  );
}
