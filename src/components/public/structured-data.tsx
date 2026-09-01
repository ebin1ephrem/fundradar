import { brand } from "@/content/copy";

/**
 * Structured data is rendered from the same values the page already shows.
 * Nothing is inferred here — a field we don't have is simply left out of the
 * JSON-LD rather than guessed at.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The object is built server-side from our own data, never from
      // user input, and JSON.stringify escapes what goes in.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function breadcrumbLd(
  base: string,
  crumbs: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${base}${crumb.path}`,
    })),
  };
}

export function organisationLd(base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    alternateName: brand.lockup,
    url: base,
    slogan: brand.tagline,
    description: brand.oneLine,
    parentOrganization: { "@type": "Organization", name: brand.parent },
  };
}

export function websiteLd(base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/opportunities?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * A funding programme maps onto schema.org/Grant. Every property below is
 * conditional: if the provider didn't state it, it does not appear.
 */
export function opportunityLd(
  base: string,
  o: {
    slug: string;
    title: string;
    shortDescription: string;
    providerName: string;
    officialSourceUrl: string;
    applicationUrl: string | null;
    applicationDeadline: Date | string | null;
    applicationOpenDate: Date | string | null;
    fundingMin: string | null;
    fundingMax: string | null;
    currency: string;
    updatedAt: Date | string;
  },
) {
  const amount =
    o.fundingMin || o.fundingMax
      ? {
          "@type": "MonetaryAmount",
          currency: o.currency,
          ...(o.fundingMin && o.fundingMax
            ? {
                value: {
                  "@type": "QuantitativeValue",
                  minValue: Number(o.fundingMin),
                  maxValue: Number(o.fundingMax),
                },
              }
            : { value: Number(o.fundingMax ?? o.fundingMin) }),
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Grant",
    name: o.title,
    description: o.shortDescription,
    url: `${base}/opportunities/${o.slug}`,
    identifier: o.slug,
    dateModified: isoDate(o.updatedAt),
    funder: { "@type": "Organization", name: o.providerName },
    ...(amount ? { amount } : {}),
    ...(o.applicationDeadline
      ? { expires: isoDate(o.applicationDeadline) }
      : {}),
    ...(o.applicationOpenDate
      ? { startDate: isoDate(o.applicationOpenDate) }
      : {}),
    ...(o.applicationUrl || o.officialSourceUrl
      ? { sameAs: o.applicationUrl ?? o.officialSourceUrl }
      : {}),
    provider: { "@type": "Organization", name: brand.lockup, url: base },
  };
}

function isoDate(value: Date | string): string | undefined {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
