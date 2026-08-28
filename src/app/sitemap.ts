import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publiclyVisible } from "@/lib/visibility";

export const dynamic = "force-dynamic";

/** Only published, active opportunities are listed — the same rule as every
 *  other public query, read from the one definition in lib/visibility. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [opportunities, categories] = await Promise.all([
    prisma.opportunity.findMany({
      where: publiclyVisible,
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 40_000,
    }),
    prisma.category.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/opportunities`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/categories`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];

  return [
    ...staticPages,
    ...categories.map((c) => ({
      url: `${base}/categories/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...opportunities.map((o) => ({
      url: `${base}/opportunities/${o.slug}`,
      lastModified: o.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
