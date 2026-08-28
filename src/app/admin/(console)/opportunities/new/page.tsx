import Link from "next/link";
import { ClipboardPaste, Link2, PencilLine, ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { PageBody, PageHeader } from "@/components/admin/page-header";
import { has } from "@/lib/env";

export const metadata = { title: "Add opportunity" };
export const dynamic = "force-dynamic";

const METHODS = [
  {
    href: "/admin/ingest/paste",
    icon: ClipboardPaste,
    title: "Paste text",
    lede: "An email, a WhatsApp forward, a LinkedIn post, a circular, or your own notes.",
    body: "We read it and organise it into a draft. Nothing needs to be tidy first.",
    badge: "Fastest",
  },
  {
    href: "/admin/ingest/url",
    icon: Link2,
    title: "Add a URL",
    lede: "One page for one opportunity.",
    body: "We fetch the page, read it, and build the same draft. If the page cannot be read, you can paste the text instead.",
    badge: null,
  },
  {
    href: "/admin/opportunities/manual",
    icon: PencilLine,
    title: "Enter it manually",
    lede: "The full structured form.",
    body: "The same schema every other route produces — useful when you already have the details to hand.",
    badge: null,
  },
];

export default async function AddOpportunityPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Add an opportunity"
        breadcrumbs={[
          { label: "Opportunities", href: "/admin/opportunities" },
          { label: "Add" },
        ]}
        description="Three ways in, one review. Whichever you pick, the result is a draft you check before it goes live."
        actions={
          <Link href="/admin/sources/new" className="btn btn-secondary btn-sm">
            Monitor a whole site instead
          </Link>
        }
      />

      <PageBody>
        <div className="grid max-w-[1000px] gap-3 lg:grid-cols-3">
          {METHODS.map((method) => (
            <Link
              key={method.href}
              href={method.href}
              className="group flex flex-col rounded-[12px] border border-line bg-canvas p-6 transition-[border-color,transform] duration-200 hover:-translate-y-[2px] hover:border-line-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-[9px] bg-subtle transition-colors duration-200 group-hover:bg-accent">
                  <method.icon className="size-[18px]" strokeWidth={1.6} />
                </span>
                {method.badge ? <span className="pill pill-dark">{method.badge}</span> : null}
              </div>

              <h2 className="mt-5 text-[18px] font-medium tracking-[-0.022em]">
                {method.title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed">{method.lede}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{method.body}</p>

              <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-medium">
                Continue
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-[3px]"
                  strokeWidth={1.8}
                />
              </span>
            </Link>
          ))}
        </div>

        <p className="hint mt-6 max-w-[70ch]">
          {has.ai()
            ? "Reading is automatic. Publishing is not — every draft waits for you."
            : "No AI provider is configured, so drafts are built by pattern matching alone. They will be thinner and every field needs checking. Publishing still waits for you either way."}
        </p>
      </PageBody>
    </>
  );
}
