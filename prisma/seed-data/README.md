# Seed data

`fundradar_initial_opportunities.json` contains the three programmes named in
`FUNDRADAR_SEED_IMPORT.md`, carrying **only** the facts that document actually
states: the title, the opportunity type and the suggested categories — plus the
₹2.5 crore programme corpus for the Tamil Nadu LangTech fund, recorded as a
corpus and explicitly **not** as a per-startup maximum.

The full `fundradar_initial_opportunities.json` / `.csv` / `.xlsx` data files
referenced by those instructions were not supplied. Everything they would have
contained — funding amounts, deadlines, eligibility, providers, application
links — is therefore absent here rather than guessed at, in line with the
platform's rule that a field the source does not state stays UNKNOWN.

Import this through **Admin → Opportunities → Import seed data**. Each record
becomes a `PENDING_REVIEW` draft that a person must complete and approve before
it is publicly visible. Drop the real files in this directory and import them
the same way when they arrive.
