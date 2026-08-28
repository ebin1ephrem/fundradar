import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * The spec uses both /grants/kerala and /categories/incubation for the same
 * landing pages. Two live URLs for one page splits ranking signals and creates
 * duplicate content, so /categories is canonical and /grants permanently
 * redirects into it.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const category = await prisma.category.findFirst({
    where: {
      slug,
      active: true,
      NOT: { slug: { contains: "subsid", mode: "insensitive" } },
    },
    select: { slug: true },
  });

  return NextResponse.redirect(
    new URL(
      category ? `/categories/${category.slug}` : "/opportunities",
      request.url,
    ),
    308,
  );
}
