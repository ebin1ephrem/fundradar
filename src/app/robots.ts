import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing behind these paths belongs in an index: the console is
        // private, and the rest are personal or transactional.
        disallow: ["/admin", "/dashboard", "/api", "/auth", "/report", "/signin"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
