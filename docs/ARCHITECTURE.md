# FundRadar architecture

## The rule everything else follows

```
SOURCE WEBSITE → CRAWLER → RAW COLLECTION → AI EXTRACTION → NORMALISATION
    → DUPLICATE CHECK → ADMIN REVIEW → ADMIN APPROVAL → PUBLIC DATABASE
```

There is no path from the crawler to the public site. Automation discovers,
extracts, classifies, de-duplicates and detects change. A person decides what
becomes public. There is deliberately no "auto publish" setting to turn on.

Concretely, the public site reads only `Opportunity` rows with
`workflowStatus = PUBLISHED`, and the only code that sets that status is
`publishOpportunity()` in `src/app/admin/(console)/opportunities/actions.ts`,
which refuses to run until every blocking requirement in `src/lib/publishing.ts`
is met.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript | Server rendering for SEO; one deployable on Vercel |
| Database | PostgreSQL + Prisma 6 | Relational data with a real many-to-many category model |
| Search | Postgres `tsvector` + `pg_trgm` | No extra service to host; swappable behind `src/lib/search` |
| Styling | Tailwind v4 with CSS custom properties | Design tokens live in `globals.css`, not scattered in classnames |
| Jobs | DB-backed queue drained by Vercel Cron | Vercel has no long-running worker process |
| Auth | Opaque server sessions in httpOnly cookies | Revocable, unlike stateless JWTs |

### Why Postgres full-text instead of Meilisearch

The target deployment is Vercel. A hosted search engine is a second service to
run, pay for and keep in sync. Postgres full-text handles this corpus size
comfortably: a generated `searchVector` column with a GIN index, weighted so the
title and provider outrank the body, plus trigram indexes for fuzzy matching on
`title`, `providerName` and `Category.name`. Everything goes through the
`SearchProvider` interface so a hosted engine can be dropped in later without
touching page code.

### The generated search column

`Opportunity.searchVector` is a Postgres `GENERATED ALWAYS AS … STORED` column
created in the init migration, and declared in `schema.prisma` as
`Unsupported("tsvector")` so Prisma does not plan to drop it. Two consequences:

- `prisma migrate dev` emits one harmless no-op,
  `ALTER TABLE "Opportunity" ALTER COLUMN "searchVector" DROP DEFAULT`.
  Delete that line from any generated migration; it is Prisma misreading a
  generated column as a defaulted one.
- Functions inside a generated column must be `IMMUTABLE`. `array_to_string`
  and `unaccent` are not, which is why neither appears in the expression.

## Data model

Six independent classification dimensions, all of them ordinary rows in
`Category` (`CategoryType`: opportunity type, industry, startup stage, founder
type, provider type, geography). An opportunity links to many categories across
many dimensions through `OpportunityCategory`, with one flagged `isPrimary`.
Nothing about the taxonomy is hard-coded in the frontend — admins create,
rename, re-parent, reorder, feature and deactivate categories, and the public
site follows immediately.

Category slugs are globally unique because each one owns a public URL
(`/categories/<slug>`). Where the same label appears in two dimensions, the seed
gives one an explicit slug (`circular-economy` is the industry;
`circular-economy-funding` is the funding programme type). The seed refuses to
run if two categories would collide.

### Never overwrite grant data

Every meaningful change writes an `OpportunityVersion` row: a full snapshot, the
list of changed fields, the source URL, who made it and who approved it.
`Opportunity.currentVersion` always equals the highest version number recorded.

### Money

`fundingMin` / `fundingMax` are `Decimal(18,2)` with a separate `currency`, plus
a free-text `fundingAmountText` for the cases a number cannot express ("up to
50% of project cost"). Where a provider states nothing, the field stays null and
the UI says "Not specified by provider" — it is never inferred.

## Security

- Admin sessions are opaque 256-bit tokens; only a SHA-256 hash is stored, so a
  database leak does not yield usable sessions. Deactivating an admin deletes
  their live sessions rather than only flagging the row.
- `middleware.ts` is a cheap cookie-presence gate so unauthenticated traffic
  never reaches an admin render. It is not the authorisation check — every admin
  page and every server action independently re-validates against the database.
- Failed sign-ins are counted from the audit log; eight within fifteen minutes
  locks the address out. Unknown email, wrong password and disabled account all
  return the same message.
- Passwords are bcrypt at cost 11.

## Integrations

Everything external is optional and behind a capability flag in `src/lib/env.ts`:

| Integration | With a key | Without one |
| --- | --- | --- |
| Anthropic | Structured field extraction with per-field confidence | Deterministic rule-based extractor, everything flagged for manual verification |
| Resend | Email delivered | Written to `OutboundMessage` so you can read exactly what would have been sent |
| WhatsApp | Alerts delivered | Same outbox fallback |
| Google OAuth | Google sign-in offered | Magic-link email only |

## Build order

1. **Phase 1** — schema, categories, admin auth, manual entry *(done)*
2. **Phase 2** — public directory, search, filters, category pages
3. **Phase 3** — lead capture, progressive profiling, dashboards
4. **Phase 4** — sources, crawler, AI extraction, admin review
5. **Phase 5** — scheduled monitoring, change detection, alerts
6. **Phase 6** — SEO, analytics, exports
