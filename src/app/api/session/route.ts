import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/leads/identity";

export const dynamic = "force-dynamic";

/** Personal state is fetched once by the persistent public client layout. */
export async function GET() {
  const { lead } = await getViewer();
  if (!lead) {
    return NextResponse.json(
      { identified: false, name: null, savedOpportunityIds: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const saved = await prisma.savedOpportunity.findMany({
    where: { leadId: lead.id },
    select: { opportunityId: true },
  });

  return NextResponse.json(
    {
      identified: true,
      name: lead.name,
      savedOpportunityIds: saved.map((row) => row.opportunityId),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
