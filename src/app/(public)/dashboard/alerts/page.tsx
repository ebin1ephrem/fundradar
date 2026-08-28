import { prisma } from "@/lib/prisma";
import { dashboard as dash, weeklySignal } from "@/content/copy";
import { requireLead } from "@/lib/leads/identity";
import { AlertsForm } from "./form";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const lead = await requireLead();

  const [subscriptions, categories, interests] = await Promise.all([
    prisma.alertSubscription.findMany({
      where: { leadId: lead.id },
      include: { categories: { select: { categoryId: true } } },
    }),
    prisma.category.findMany({
      where: {
        active: true,
        parentId: null,
        categoryType: { in: ["OPPORTUNITY_TYPE", "INDUSTRY"] },
        NOT: { slug: { contains: "subsid", mode: "insensitive" } },
      },
      orderBy: [{ categoryType: "asc" }, { displayOrder: "asc" }],
      select: { id: true, name: true, categoryType: true },
    }),
    prisma.leadCategoryInterest.findMany({
      where: { leadId: lead.id },
      select: { categoryId: true },
    }),
  ]);

  const weekly = subscriptions.find(
    (s) => s.frequency === "WEEKLY_DIGEST" && s.channel === "EMAIL",
  );
  const reminders = subscriptions.find(
    (s) => s.frequency === "DEADLINE_REMINDER" && s.channel === "EMAIL",
  );
  const whatsapp = subscriptions.find(
    (s) => s.frequency === "DEADLINE_REMINDER" && s.channel === "WHATSAPP",
  );

  const selected = new Set(
    weekly?.categories.length
      ? weekly.categories.map((c) => c.categoryId)
      : interests.map((i) => i.categoryId),
  );

  return (
    <div className="max-w-[720px]">
      <h2 className="display-md">{weeklySignal.preferences.headline}</h2>
      <p className="lede mt-2">{weeklySignal.preferences.subline}</p>
      <p className="mt-2 text-[14px] text-muted">{dash.sections.alertsHint}.</p>

      <div className="mt-8">
        <AlertsForm
          categories={categories}
          selectedCategoryIds={[...selected]}
          weekly={weekly?.active ?? true}
          reminders={reminders?.active ?? false}
          whatsappAlerts={whatsapp?.active ?? false}
          emailConsent={lead.emailMarketingConsent}
          whatsappConsent={lead.whatsappMarketingConsent}
          hasWhatsapp={Boolean(lead.whatsapp)}
        />
      </div>
    </div>
  );
}
