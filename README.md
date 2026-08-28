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
   Set `DATABASE_URL` to the pooled URL and `DIRECT_DATABASE_URL` to the direct
   one — Prisma migrations need an unpooled connection.
2. Set `NEXT_PUBLIC_APP_URL` to your domain and `CRON_SECRET` to a random string.
3. Deploy. The build script runs `prisma generate` before `next build`.
4. Run `npm run db:migrate && npm run db:seed` once against the production
   database.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Generate the Prisma client, then build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed categories, settings and the first admin |
| `npm run db:studio` | Prisma Studio |
| `npm run smoke` | Browser smoke test against a running server (see below) |

### Smoke test

`tests/phase1.smoke.mjs` drives a real browser through the admin flow: the auth
gate, a wrong-password rejection, sign-in, creating a category, creating and
publishing an opportunity across three category dimensions, the publication gate
refusing an incomplete record, the audit trail, and sign-out revoking access.

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
src/lib/env.ts                which integrations are switched on
src/app/globals.css           the design tokens
```
