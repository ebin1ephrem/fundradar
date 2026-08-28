# FundRadar

A discovery platform for startup grants and funding opportunities, and the
admin console that keeps the database trustworthy.

Two sides, one database:

- **Public** — founders search, filter and browse verified funding
  opportunities, then convert into leads at the moment they want more detail.
- **Admin** — sources are monitored, pages are crawled and extracted, and
  every record passes a human review before it can go public.

## The non-negotiable rule

Automation can discover, extract, classify, de-duplicate and detect change.
**Only an admin can publish.** There is no scraper-to-website path, and no
"auto publish" switch to turn on. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Running it locally

Requires Node 20+ and PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL
npm run db:migrate            # create the schema
npm run db:seed               # 240 categories + your first admin
npm run dev
```

The seed prints a generated admin password once. Sign in at
[localhost:3000/admin](http://localhost:3000/admin).

Nothing else is required to run the whole platform. Every third-party
integration — AI extraction, email, WhatsApp, Google sign-in — activates only
when you add its key, and has a working local fallback until you do.

## Deploying to Vercel

1. Create a Postgres database (Vercel Postgres, Neon and Supabase all work).
   Set `DATABASE_URL` to the application URL and `POSTGRES_URL` to the direct
   URL for the same database. The Prisma Postgres Vercel integration provides
   both variables automatically.
2. Set `NEXT_PUBLIC_APP_URL` to your domain and `CRON_SECRET` to a random string.
3. Deploy. The build script runs `prisma generate`, applies all pending
   migrations with `prisma migrate deploy`, and then runs `next build`.
4. Run `npm run db:seed` once against the production database to create the
   initial categories, settings and admin account. Migrations are applied
   automatically on every deployment and are safe to rerun.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Generate Prisma, deploy pending migrations, then build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed categories, settings and the first admin |
| `npm run db:studio` | Prisma Studio |
| `npm run db:fixtures` | Load sample opportunities for local development |
| `npm run check:search` | Exercise the search provider directly |
| `npm run smoke` | Browser smoke tests against a running server (see below) |

### Sample data

`npm run db:fixtures` loads fourteen invented funding programmes so the
directory, search, filters and category pages have something to show locally.
Every provider in it is fictional and the script refuses to run against a
production database.

### Smoke tests

Four suites, 123 checks between them.

`npm run check:search` — search behaviour without a browser: parsing and
stopword handling, minimum-should-match, typo tolerance, category-aware
matching, every filter, sorting, facets, pagination and SQL-injection safety.

`tests/phase1.smoke.mjs` — the admin flow: the auth gate, a wrong-password
rejection, sign-in, creating a category, creating and publishing an opportunity
across three category dimensions, the publication gate refusing an incomplete
record, the audit trail, and sign-out revoking access.

`tests/phase2.smoke.mjs` — the public site: typo-tolerant and multi-word search,
category-aware matching, faceted filtering across dimensions, sorting, closed
programmes hidden by default, the detail page's public sections and trust block,
category landing pages, the `/grants` redirect, 404s, filtering with JavaScript
disabled, and no horizontal overflow on mobile.

`tests/phase3.smoke.mjs` — the lead journey: browsing without a prompt, the gate
on deeper sections, the popup opening on a locked action and after several
views, capture unlocking in place, being remembered afterwards, saving,
the dashboard, progressive profiling raising completion, separate email and
WhatsApp consent, sign-out, magic-link sign-in that reveals nothing about who
exists, and the admin lead views and CSV export.

```bash
npm run build && npx next start -p 3100 &
SMOKE_EMAIL=you@example.com SMOKE_PASSWORD=… npm run smoke
```

## Where things live

```
prisma/schema.prisma          the data model
prisma/seed-data/categories   the starting taxonomy — data, not code
src/app/(public)              the founder-facing site
src/app/admin                 the console
src/lib/publishing.ts         what a record needs before it can go public
src/lib/versioning.ts         snapshots, so grant data is never silently overwritten
src/lib/search/               ranked Postgres search, behind one interface
src/lib/leads/                identity, scoring, activity
src/lib/gating.ts             what a visitor sees before giving their details
src/lib/env.ts                which integrations are switched on
src/app/globals.css           the design tokens
```
