# AGENTS.md — Project Context for AI Agents

> **Purpose:** the single, verified source of truth for anyone (human or agent) working in this
> repo. Read this **first** — it supersedes the historical specs in `/plan`, which contain
> stale assumptions from earlier Cloudinary-era work.
>
> **Verified against:** release `v3.2.1` (2026-10-06) — navbar compaction: a Shop link to the
> Fourthwall storefront (a real anchor, not a hash-router button), Home/Dashboard as icon-only
> buttons with labels preserved for AT, "Contact Me" → "Contact". UI-only: no schema, API, or
> dependency change; `v3.2.0` ("Group", 2026-09-16) added 2 migrations (`plan_releases` +
> `plan_items.notified_at`) and one cron job (`/api/cron/plan-digest`), bringing the repo to
> **18 migration files**. The schema section was last re-verified by live introspection against
> `v3.1.0` — see `data/archive/schema_introspection.md`. ⚠️ This header was stale for three
> releases (`v2.14.0`–`v3.0.0`) before that; it is part of the release checklist — see §9.

---

## 1. What this project is

Official digital gallery, catalog raisonné, and studio CMS for Austin artist **Rory Skagen**
(`roryskagenart.com`). Full-stack SPA: public collector gallery + `#/admin` studio CMS.

The v3 objective is to **merge the two archived predecessor websites** (mural projects + fine
art) into this app's Supabase catalog. See `plan/PRD_V3_WAYBACK_DATA_MIGRATION.md`.

---

## 2. Dev environment & commands (transcribed from `package.json` — do not guess)

`npm ci` (or `npm install`) is required first; `node_modules` is gitignored and may be absent on a
fresh clone, in which case `npx vitest`/`npx tsc` die with `ERR_MODULE_NOT_FOUND` before running
anything — that is a missing install, not a broken test.

| Task | Exact command |
| :--- | :--- |
| Dev server (Express + Vite) | `npm run dev` → `tsx server.ts` |
| Typecheck / lint | `npm run lint` → `tsc --noEmit` (there is **no** ESLint in this repo) |
| Unit tests | `npm test` → `vitest run` |
| Tests, watching | `npm run test:watch` |
| Production build | `npm run build` → `vite build && tsx scripts/prerender-seo.ts && esbuild server.ts …` |
| Serve the built server | `npm start` → `node dist/server.cjs` |
| Serverless bundle only | `npm run build:api` → esbuild → `api/index.js` |
| Route smoke test | `npm run smoke` → `tsx scripts/smoke-serverless.ts` |
| Preview the static client | `npm run preview` |
| Clean | `npm run clean` → `rm -rf dist server.js` |

`npm run build` has **three** phases and the middle one is easy to drop: `vite build` (client) →
`prerender-seo.ts` (per-artwork HTML + `sitemap.xml` into `dist/`) → esbuild (server). Skipping the
prerender phase yields a build that deploys perfectly and is invisible to search engines.

⚠️ **`vitest.config.ts` sets `testTimeout: 15000`, not the 5 s default, and that is deliberate.**
These are real-timer tests (`userEvent` drives genuine keystrokes); under load the `environment`
phase has measured 252–297 s against a nominal ~10 s. "Fixing" a slow test by raising the timeout
further masks a hang — `ArtworkEditDialog.autosave.test.tsx` shows the preferred pattern (fire rapid
input synchronously so "rapid" holds by construction). `globals: true` is set, so
`describe`/`it`/`expect` need no import, and `@` aliases to the repo root.

---

## 3. Verified stack (do not assume otherwise)

| Layer | Actual | Notes |
| :--- | :--- | :--- |
| Client | **React 19**, Vite 6, Tailwind **v4**, shadcn/ui (Radix) | `AdminApp` is `React.lazy`-loaded (`src/App.tsx`) |
| Backend | Express 4, **modularized** under `server/` | `server.ts` is a slim entrypoint |
| Database | **Supabase PostgreSQL** (`orphcusijzkxpxkzapjp`) | single source of truth |
| Auth | **Supabase Auth** + `public.profiles` roles | admin / editor / viewer |
| Media | **Supabase Storage** bucket `artwork-images` | thumb/hero/full/lqip WebP renditions |
| Email | Resend | studio-owned mailer: inquiries **and** all staff invites / password resets |
| Off-site backup | **Vercel Cron** → **Vercel Blob** | daily dump at `/api/cron/backup`; private objects; see §5 |
| **Cloudinary** | **REMOVED** | no package, no routes, no resolution step |

⚠️ **Cloudinary is fully decommissioned.** `package.json` has **no `cloudinary` dependency**;
`server.ts` and all of `server/routes/*` have zero Cloudinary references; the image resolution chain
is `external URL → Supabase asset registry → SVG fallback` (`src/lib/markdown.ts`).
Historical mentions in `/plan`, `data/archive/`, and a frozen fallback string in
`src/components/AboutView.tsx` are **provenance only** — do not reintroduce the vendor.

> **Note:** `multer` is **still a dependency** and is *not* a Cloudinary leftover — it is used by
> `POST /api/media/upload` (`server/routes/media.ts`) to receive an image and stream it into the
> Supabase Storage `artwork-images` bucket. Keep it.

### Email: there are TWO mailers (do not conflate them)

| Mailer | Owns | Controlled by |
| :--- | :--- | :--- |
| **Resend** | inquiries, staff invites, admin-issued password resets, access/email-change notices, test send | this repo — `server/emailService.ts` + `server/emailTemplates.ts` |
| **Supabase Auth** | sign-up confirmation, magic link, reauthentication, and the *dashboard* fallbacks | the Supabase dashboard only — **not** the repo |

Branding one does **not** brand the other. All studio-visible mail is rendered from the single
branded shell in `server/emailTemplates.ts` (`BRAND`, `renderBrandedEmail()`); the studio routes its
own invites and resets through Resend precisely so the copy and the logo are code-controlled.
The Supabase Auth mailer is branded separately by pasting the generated files in
`supabase/email-templates/` into the dashboard — regenerate them with
`npx tsx scripts/generate-auth-email-templates.ts`. See
[`docs/runbooks/supabase-email-branding.md`](docs/runbooks/supabase-email-branding.md).

---

## 4. Authoritative environment variables

The code reads these names (see `.env.example`). Do **not** use the generic
`SUPABASE_URL` / `POSTGRES_URL` names from the old README.

```bash
# Supabase / PostgreSQL (Vercel integration naming)
NEXT_PUBLIC_VRCL_SUPA_SUPABASE_URL=
NEXT_PUBLIC_VRCL_SUPA_SUPABASE_PUBLISHABLE_KEY=
VRCL_SUPA_SUPABASE_ANON_KEY=
VRCL_SUPA_SUPABASE_SERVICE_ROLE_KEY=
VRCL_SUPA_POSTGRES_PRISMA_URL=          # preferred connection string
VRCL_SUPA_POSTGRES_URL_NON_POOLING=
VRCL_SUPA_SUPABASE_JWT_SECRET=

# Email
RESEND_API_KEY=
RESEND_EMAIL_DOMAIN=
ADMIN_EMAIL=                            # inquiry + studio notification recipient
STUDIO_CC=                              # comma-separated extra recipients; empty disables the cc
EMAIL_MODE=live|redirect|off            # see the routing trap below — unset infers from VERCEL_ENV
EMAIL_REDIRECT_TO=                      # REQUIRED whenever EMAIL_MODE=redirect (else mail is dropped)
SITE_URL=                               # public origin used in email links (falls back to the live site)
BRAND_LOGO_URL=                         # optional absolute brand-mark URL; defaults to ${SITE_URL}/android-chrome-192x192.png
```

Local `.env` and `.env.local` exist (gitignored). **Never print or commit their contents.**

⚠️ **`EMAIL_MODE` is a send switch, not a preference.** `server/lib/emailRouting.ts` resolves it
once, centrally: `live` delivers to real recipients, `redirect` rewrites every recipient to
`EMAIL_REDIRECT_TO` and prefixes the subject `[PREVIEW]`, `off` sends nothing. Unset ⇒ inferred from
`VERCEL_ENV` (`production`→`live`, otherwise `redirect`). **`redirect` with no `EMAIL_REDIRECT_TO`
SUPPRESSES the message entirely rather than falling back to the real recipient** — so a preview that
"quietly delivers nothing" is usually this, not a Resend failure. Set it explicitly when testing
against production data; never rely on the inference. Runbook: `docs/runbooks/email-delivery.md`.

⚠️ **`@google/genai` is in `package.json` but nothing imports it** (verified across `src/`, `server/`,
`scripts/`). It is not wired to any route or view. Do not assume an AI feature exists because the
dependency is present — and do not build one on it without asking.

---

## 5. How to write to the database (the established path)

Two supported routes — prefer the first (it is already wired and idempotent):

1. **SQL migration via the runner** (best practice for schema + bulk data):
   ```bash
   npx tsx scripts/run-migrations.ts            # apply all pending
   npx tsx scripts/run-migrations.ts <file>.sql # apply specific files
   ```
   Files live in `supabase/migrations/`, are applied in filename order, and are tracked in
   `public.schema_migrations` (safe to re-run). Connection string comes from the env vars above
   (`scripts/run-migrations.ts`). The runner also **creates `public.schema_migrations` and enables
   RLS on it** — with no policies, so the anon key sees zero rows. That belongs in the runner
   rather than a migration because no migration creates the table, and
   `src/test/migrationSafety.test.ts` asserts RLS is enabled only on tables a migration creates.

2. **Supabase admin client** (programmatic upserts, bypasses RLS):
   `getSupabaseAdmin()` in `src/server/db.ts` uses `VRCL_SUPA_SUPABASE_SERVICE_ROLE_KEY`.

Regenerating the client asset map after media changes:
```bash
npx tsx scripts/generate-asset-registry.ts   # rewrites src/data/assetRegistry.ts from media_assets
```

Inspecting and backing up the live database (**read-only** — run the backup before any write):
```bash
npx tsx scripts/introspect-schema.ts         # dumps live schema + policies → data/archive/schema_introspection.md
npx tsx scripts/backup-catalog.ts            # per-table JSON snapshot → data/backups/<timestamp>/
npx tsx scripts/verify-backup.ts             # re-check any dump against its manifest (--all, --json)
npx tsx scripts/verify-media-backup.ts       # reconcile media_assets against the Storage bucket
```
A dump is **manifest format v2** (sha256 per table) and `backup-catalog.ts` self-verifies before it
exits. Dumps taken before ~2026-09-14T18:15Z are v1 — restorable, but **unverifiable** (no
checksums); a v1 manifest is identified by the *absence* of `formatVersion`, not by `=== 1`.
See [`docs/runbooks/database-backup-restore.md`](docs/runbooks/database-backup-restore.md) for the
rollback procedure and the pre-migration checklist.

### Off-site backup (v2.13.0) and the plan digest (v3.2.0)

`vercel.json` schedules **two** cron jobs, both gated on `CRON_SECRET` (Vercel Cron sends
`Authorization: Bearer $CRON_SECRET`; unset ⇒ the endpoint answers **503**):

| Path | Schedule | Route |
| :--- | :--- | :--- |
| `/api/cron/backup` | `43 6 * * *` | `server/routes/cronBackup.ts` → Vercel Blob `catalog-backups/<stamp>/` |
| `/api/cron/plan-digest` | `17 7 * * *` | `server/routes/cronPlanDigest.ts` → one batched email of new public `plan_items` |

The backup builds the same dump as the CLI via `server/lib/catalogDump.ts`, so the CLI writer and
the scheduled writer cannot drift apart. The digest is de-duplicated by `plan_items.notified_at`
(`server/lib/planDigest.ts`), so a row already mailed is never mailed twice.

- Objects are written `access: 'private'` — a dump contains `profiles` emails and collector PII.
- Retention: keep 14 recent, one per month, never delete anything under 7 days old.
- ⚠️ Hobby Blob includes **1 GB/month and 2,000 advanced ops**; exceeding either **cuts off Blob
  access for 30 days** rather than billing. One run is ~0.5 MB and ~10 advanced ops. `del()` is free.
- Hobby cron jobs may only run **once per day**, with per-hour scheduling precision — hence the
  `43 6`/`17 7` minute offsets rather than `0 6`/`0 7`.
- ⚠️ **Editing `vercel.json`'s `buildCommand` and `package.json`'s `build` script is one change, not
  two.** They are separate strings that must stay byte-identical in their `vite build && tsx
  scripts/prerender-seo.ts && esbuild …` prefix; they have already drifted once. The build writes
  `api/index.js`, and both `functions["api/index.js"]` and the `/api/(.*)` rewrite bind to it.

### Local scratch database — and why the Supabase CLI must not run migrations

`supabase start` brings up a full local stack: Postgres on `127.0.0.1:54322`, REST/Studio on
`:54321`/`:54323`. It is the only non-production database this project has, and the runbook's
pre-migration checklist requires one before any live migration.

```bash
npx supabase start                       # requires Docker Desktop — see the PATH note below
VRCL_SUPA_POSTGRES_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres' \
  npx tsx scripts/run-migrations.ts      # build the schema with THIS repo's runner
npx tsx scripts/restore-catalog.ts --from data/backups/<ts> \
  --db-url 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' --apply
```

> ⚠️ **That env override is load-bearing, and it used to be silently ignored.** `.env` sets the
> **production** `VRCL_SUPA_POSTGRES_PRISMA_URL`, which `run-migrations.ts` consulted *first*, while
> `dotenv` fills in any variable the shell had **not** exported — so exporting only
> `VRCL_SUPA_POSTGRES_URL` applied migrations to **production** while the operator believed they were
> rehearsing locally (R-07's exact nightmare). Fixed 2026-09-15: an operator-exported variable now
> outranks the `.env` one — `pickConnectionString()` in `scripts/lib/pgTarget.ts`, unit-tested. The
> same pattern still exists in the other `scripts/` CLIs that read a connection string.
> **Always read the `Target:` line the runner prints before trusting a run.**

⚠️ **`supabase/config.toml` sets `[db.migrations] enabled = false` and `[db.seed] enabled = false`.
Do not re-enable them.** The CLI derives a migration's ledger `version` from the *leading digits* of
the filename and requires `<14-digit timestamp>_name.sql`, so every file here (`2026_09_01_…`,
`2026_09_12_…`) collapses to version `2026` and `supabase start` dies with
`duplicate key value violates unique constraint "schema_migrations_pkey"`. **Do not rename the
migration files to satisfy the CLI** — the repo runner keys on the full filename, and renaming would
make every migration look unapplied. This is the two-ledger hazard in §6, confirmed empirically; see
runbook §7a/§7b.

Docker Desktop installs to a **per-user** path that is not on `PATH`:
`%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`.

> **No Supabase MCP server is configured in this repo.** Do not assume one exists.

---

## 6. Database schema (after all 18 migrations)

Core tables: `artworks`, `pages`, `inquiries`, `profiles`, `taxonomies`, `artwork_terms`,
`settings`, `media_assets`, `artwork_images`, `plan_items`, `plan_releases`.

> ✅ **`v3.0.0` (Phase 4) added the mural dimension — 3 migrations, applied 2026-09-15.**
> `2026_09_15_v3_phase4_schema_extension.sql` adds `artworks.kind` (`painting` | `mural` | `other`),
> the three source-provenance columns (`source_site`, `source_url_path`, `source_archive_path`),
> widens `taxonomies_type_check` to admit `project_type` and `curation`, and creates
> **`public.artwork_images (artwork_slug, media_public_id, position)`** with FKs to `artworks(slug)`
> and `media_assets(public_id)` (both `ON UPDATE CASCADE`), RLS enabled, a public-read policy and an
> `is_admin_or_editor()` write policy. Then the promoted Wayback backfill (67 INSERTs, 118
> fill-only-empty UPDATEs), then `2026_09_15_v3_phase4_year_correction.sql` (the D4 overwrite of 2
> mural years). **Live result at that point: 10 tables, 15 recorded migrations** — see
> [`data/archive/schema_introspection.md`](data/archive/schema_introspection.md).
>
> ✅ **`v3.1.0` added `public.plan_items` — 1 migration, applied 2026-09-15.**
> `2026_09_15_v3_1_plan_items.sql` creates the studio planning board: `kind` (`idea` | `feature` |
> `bug` | `task` | `suggestion`), `status` (6-state machine), `priority`, `target_release` (free
> text, not an FK — `v3.2.0` introduces `plan_releases`), `source` (`public` | `studio`),
> `source_ref` (unique, used by the mural seed as `artwork:<slug>`), and nullable `author_id` →
> `profiles(id)` `ON DELETE SET NULL`. RLS is enabled with **exactly one policy**
> (`Admins manage plan_items`, `FOR ALL TO authenticated`) — the anon key sees zero rows, which is
> the boundary the API relies on. **Live result then: 11 tables, 16 recorded migrations.**
>
> ✅ **`v3.2.0` added `public.plan_releases` and the grouping/digest columns — 2 migrations,
> applied 2026-09-16.** `2026_09_16_v3_2_plan_releases.sql` creates the release entity
> (`version text UNIQUE`, `status ∈ planned|in_progress|shipped|cancelled`, `target_date`,
> `shipped_at`, `notes`) with RLS and the same `is_admin_or_editor()` policy, adds
> `plan_items.release_id → plan_releases(id)` **nullable, `ON DELETE SET NULL`**, and backfills it
> from `target_release` (which is **kept** so the backfill stays auditable — see the trap below).
> `2026_09_16_v3_2_plan_items_notified_at.sql` adds `plan_items.notified_at`, the batched digest's
> memory of what it has already mailed. **Live result now: 12 tables, 18 recorded migrations**, and
> a verified dump covers **11 tables** (everything but `profiles` and `schema_migrations`).
>
> ⚠️ **The backfill was a genuine no-op on apply — and was then rehearsed.** `plan_items` was
> empty, so it inserted 0 releases. That is not evidence it works, so the two statements were run
> against the live schema inside a `BEGIN … ROLLBACK` with fixtures: two items sharing `v3.2.0`
> collapsed to one release and both were filed; `  v3.3.0  ` was trimmed and matched; `backlog`
> became a release on purpose; `NULL` and blank labels were skipped; a second run created no
> duplicates; and the rollback left 0 rows. ⚠️ It runs **once** — an item created *after* the
> migration with a `target_release` label gets **no** `release_id`, so it lands in the board's
> unfiled bucket showing its label. That is the intended v3.2.0 behaviour, not a bug.
>
> ⚠️ **The board's identity fields are never read from a request body.** `server/lib/planRules.ts`
> derives `source` / `source_ref` / `author_id` / `status` / `priority` from *which door* the request
> arrived at, not from the payload — so a public submission that posts `source: 'studio'` or
> `author_id: <someone>` is stored as an anonymous `suggestion`. That asymmetry is asserted in
> `src/test/planRules.test.ts` and was rehearsed against a live table before shipping.
>
> ⚠️ **`plan_items` must stay in the backup set.** It is registered in `scripts/lib/restorePlan.ts`
> (`TABLES`, `RESTORE_ORDER`, `CATALOG_TABLES`) — a dump covers **11 tables**. This is R-07: a table
> absent from `RESTORE_ORDER` is not dumped at all, and the dump still looks complete.
> `plan_releases` was added to `CATALOG_TABLES` with it, because `plan_items.release_id` FKs to it
> and a catalog restore that omitted it would fail that FK on every grouped item.
>
> ⚠️ **`media_assets.artwork_slug` has NO foreign key** — unlike `artwork_images.artwork_slug`. That
> is why nothing ever caught **10 rows pointing at a slug no artwork has** (`wisdom-cofee` vs
> `wisdom-coffee`, `kelzon-5` vs `kelzon-v`, …). Recorded, not remediated: adjudicating which
> near-miss is correct is an owner decision.
>
> ⚠️ **`artwork_images` is part of the backup/restore set** (`scripts/lib/restorePlan.ts`). It was
> briefly *not* — the only recovery path would have restored a catalog whose murals had lost their
> cover ordering. At `v3.0.0` a dump covered **9 tables**; with `plan_items` it covers **10**.
>
> ✅ **The schema is now reproducible from version control.** The four core domain tables
> (`artworks`, `media_assets`, `pages`, `inquiries`) were created directly in the Supabase project
> and were never captured by a migration. `supabase/migrations/2026_09_01_baseline_core_tables.sql`
> now `CREATE`s them along with their indexes, RLS enablement, and policies. It is dated to sort
> **before** every migration that `ALTER`s them (the runner applies files in lexicographic filename
> order) and is `IF NOT EXISTS` / `DROP POLICY IF EXISTS` throughout, so it is a no-op against the
> existing database. That invariant is enforced by `src/test/migrationSafety.test.ts`.
> See [`docs/adr/0001`](docs/adr/0001-schema-as-code-before-data-migration.md).
>
> ✅ **That claim is now verified empirically, not just asserted (2026-09-14).** Every table was
> dropped from the local scratch database, the schema was rebuilt from `supabase/migrations/`
> alone (**10/10 applied to a virgin database**), and the result was introspected and diffed
> against production. **No structural differences remain** — tables, columns, types, defaults,
> constraints, indexes, all 20 policies, both `artworks` guard triggers, all 7 functions and all
> 9 RLS flags match. The exercise found one real gap, since fixed: production had RLS enabled on
> `schema_migrations` and no migration created that state, so a rebuild left the migration ledger
> readable with the anon key. `scripts/run-migrations.ts` now enables it — see §5.
>
> ✅ **Line endings are now pinned (2026-09-14).** `.gitattributes` sets `*.sql text eol=lf`, which
> overrides the machine-global `core.autocrlf = true`. This matters because `pg_get_functiondef`
> returns the stored source verbatim: two migration files had been checked out CRLF, so a database
> built from that checkout carried 17 CR bytes inside its stored function bodies while production had
> 0. The committed form was already LF, so no content rewrite was needed — the two files were simply
> re-checked out, and a rebuild now reports **0 CR bytes in all 7 functions**. See
> `plan/ROADMAP_V3.md` R-16.

> ℹ️ **The migration ledger was reconciled in `v2.10.0`.** `public.schema_migrations` had recorded
> only 6 of the 9 files, while the effects of the two unrecorded ones
> (`2026_09_13_v2_9_security_rls_hardening.sql` and `2026_09_v3_media_assets_extend.sql`) were
> already live — they had been applied out-of-band. Re-running the runner recorded them, so the
> ledger now holds **9 of 9**, and an introspection diff confirmed nothing but the ledger changed.
> The lesson stands: the ledger is only as trustworthy as the discipline around it — always apply
> migrations through `scripts/run-migrations.ts`, never by pasting SQL into the dashboard.

Key facts:
- `artworks` carries lifecycle flags `enabled / archived / trashed / draft` and `hero_slider`.
  A DB trigger (`trg_artworks_draft_guard`) forces `enabled = false` whenever `draft = true`.
- `artworks.image_url` stores a **filename ref** (e.g. `gianondor.jpg`), not a full URL — the
  client resolves it through the asset registry.
- `taxonomies` (`type ∈ series|tag|medium|location`) + `artwork_terms` (M2M) back the filters.
- `media_assets` is the media registry of record: `public_id`, `url`, `thumbnail_url`,
  `lqip`, `renditions` (jsonb), `artwork_slug`.
- RLS is enabled on all public tables (hardened in `2026_09_13_v2_9_security_rls_hardening.sql`).
- ⚠️ **The `artworks` public SELECT policy does not exclude drafts** — it is `USING (trashed = false)`,
  so draft rows are reachable with the anon key via a direct PostgREST query. It is not currently
  exploitable because the client reads through `/api/artworks`, which filters drafts server-side —
  **do not remove that filter**, and do not add a direct client-side Supabase read of `artworks`.
  Tightening the policy is a tracked follow-up (see `CHANGELOG.md`, v2.10.0).

**Live row counts** (verified by introspection, 2026-09-16):
`artworks` = 205 · `artwork_images` = 168 · `artwork_terms` = 142 · `media_assets` = 320 ·
`taxonomies` = 13 · `pages` = 4 · `settings` = 5 · `profiles` = 4 · `inquiries` = 1 ·
`plan_items` = 0 · `schema_migrations` = 16.
`src/data/assetRegistry.ts` currently exposes **457 registry keys** — 1,002 top-level entries holding
1,943 key strings, **457 distinct** after de-duplication. The number to quote is **457**; the other
two are recorded so the next person can re-derive it instead of guessing which count "keys" meant.

⚠️ These move with every load — re-derive them with `npx tsx scripts/introspect-schema.ts` before
relying on them. `artwork_terms` was **empty** when this section was first written (the taxonomy rows
existed but nothing was linked, so the M2M filter path was unexercised); `v3.0.0` Phase 4 populated
it and it is 142 rows now, so that path **is** exercised.

---

## 7. Repository map (what lives where)

```
├── server.ts               # slim Express entrypoint (mounts routers, exports app)
├── server/
│   ├── middleware/auth.ts  # resolveCmsUser / requireAuth / requireRole
│   ├── routes/*.ts         # artworks, pages, taxonomies, settings, media, inquiries, adminUsers,
│   │                       # plan, cronBackup, cronPlanDigest
│   ├── lib/userAdmin.ts    # pure user-admin rules: state, patches, lockout guards (unit-tested)
│   ├── lib/planRules.ts    # pure planning-board rules: the two-door asymmetry, the patch
│   │                       #   allow-list, status transitions, filter parsing (unit-tested)
│   ├── lib/planDigest.ts   # the batched public-feedback email; de-dupes on plan_items.notified_at
│   ├── lib/requestGuards.ts # shared public-write abuse controls — honeypot + in-process rate
│   │                       #   limit; used by POST /api/inquiries AND POST /api/plan/feedback
│   ├── lib/catalogDump.ts  # the one dump builder — CLI writer and the cron writer share it
│   ├── lib/blobBackup.ts   # Vercel Blob upload + retention for the scheduled backup
│   ├── lib/cronAuth.ts     # CRON_SECRET bearer check (fails closed when unset)
│   ├── lib/emailRouting.ts # EMAIL_MODE live/redirect/off — the single send switch (see §4)
│   ├── lib/imageRenditions.ts # the shared sharp rendition ladder (thumb/hero/full/lqip)
│   ├── lib/mediaUpload.ts  # multer → Supabase Storage; shares imageRenditions
│   ├── lib/webhookSignature.ts # inbound signature verification
│   ├── emailTemplates.ts   # the branded email shell + BRAND identity (single source of email look)
│   └── emailService.ts     # Resend integration (inquiries, invites, resets, notices)
├── api/                    # Vercel serverless entry (CommonJS — see api/package.json)
├── src/
│   ├── components/         # public views + admin/ CMS + ui/ primitives (+ co-located .test.tsx)
│   ├── engine/             # galleryStateEngine.ts (DB-backed reactive store)
│   ├── data/               # assetRegistry.ts (generated), releaseLog.generated.ts (generated),
│   │                       # assetResolver.ts, registries
│   ├── lib/                # supabase.ts, adminApi.ts, markdown.ts,
│   │                       # roles.ts (shared role vocabulary), planVocabulary.ts (shared
│   │                       #   planning vocabulary + status transitions), antiSpam.ts (the
│   │                       #   honeypot field, shared by server read and form render),
│   │                       # authRedirect.ts (auth hand-off),
│   │                       # adminRoute.ts (hash-route parse), narrative.ts (record → parts),
│   │                       # dimensions.ts (free-text size → inches)
│   └── server/db.ts        # pg Pool + Supabase admin client
├── supabase/migrations/    # 18 idempotent SQL migrations (the baseline sorts first)
├── supabase/email-templates/  # generated Supabase Auth mailer templates + manifest.json
├── scripts/                # run-migrations, introspect-schema, backup-catalog, verify-backup,
│   │                       # verify-media-backup (--out writes an object listing),
│   │                       # verify-offsite-backup (the Blob side, not the local dump),
│   │                       # restore-catalog, snapshot-canonical-catalog, delete-inquiries,
│   │                       # generate-asset-registry, generate-auth-email-templates,
│   │                       # generate-source-of-truth-backfill,
│   │                       # generate-release-log (parses CHANGELOG.md + DEPLOYMENT_LOG.md →
│   │                       #   src/data/releaseLog.generated.ts; deterministic, no timestamp),
│   │                       # seed-plan-board (idempotent: one review task per unpublished mural,
│   │                       #   keyed source_ref = 'artwork:<slug>'; --dry-run supported),
│   │                       # smoke-serverless (the `npm run smoke` route walker),
│   │                       # migrate-cloudinary-to-supabase (retired pipeline, kept for
│   │                       #   provenance — it now imports the shared encoder in server/lib),
│   │                       # wayback-{extract,link,register,render,stage-sql,taxonomies,
│   │                       #   recovered-extract}.ts (immutable-archive readers — see §8),
│   │                       # verify-migration.cjs (standalone node check),
│   │                       # prerender-seo (per-artwork HTML + sitemap.xml into dist/,
│   │                       #   runs between `vite build` and the esbuild step — see package.json
│   │                       #   AND vercel.json, which are two separate strings that must agree)
│   └── lib/                # pure, offline-tested logic: migrationPlan (ordering/skip),
│                           # restorePlan (restore safety), backupManifest (v2 manifest +
│                           # verification + retention), dumpDir (dump I/O edge),
│                           # mediaReconcile (rows ↔ Storage), pgTarget (TLS rule),
│                           # releaseLog (the CHANGELOG/DEPLOYMENT_LOG parser),
│                           # seoPlan (Phase 2: which rows are indexable, canonical/og tags,
│                           #   sitemap XML, and the loopback-origin refusal)
├── src/test/               # vitest suites (incl. migrationSafety + migrationPlan + userAdmin +
│                           #   planRules + requestGuards + adminNavGuard + releaseLog)
├── data/archive/           # historical manifests + live schema introspection (provenance)
├── data/backups/           # gitignored logical dumps (see docs/runbooks/)
├── wayback/                # archived predecessor sites (v3 migration source — see §8)
├── docs/PRD.md             # Admin UI reliability PRD (implemented)
├── docs/adr/               # Architecture Decision Records (see ADR 0001)
├── docs/runbooks/          # operational procedures (backup/restore, Supabase email branding)
└── plan/                   # see plan/README.md for status of every spec
```

---

## 8. The v3 migration source (read before touching `wayback/`)

`wayback/` holds two static Wayback snapshots:

| Archive | Content | index.html files |
| :--- | :--- | :--- |
| `wayback/centraltexasmurals.com-v1/` | Mural projects (WordPress "Modularity") | 118 (incl. feeds/pagination) |
| `wayback/roryskagen.com-v1/` | Fine-art portfolio (WordPress "Berlin") | 159 (incl. feeds/pagination) |

**This is a MERGE, not a cold seed** — the fine-art catalog is already in the DB; the murals are
the net-new content. DB slugs are canonical and diverge from wayback folder names (e.g.
`today` → `today-atomic-sunrise`). The full extraction + reconciliation plan and a
copy-paste agent prompt are in **`plan/PRD_V3_WAYBACK_DATA_MIGRATION.md`**.

Do **not** modify anything inside `wayback/` — it is an immutable archive.

---

## 9. Conventions & guardrails

### Roles & permissions (the matrix is authoritative)

Role vocabulary lives in **`src/lib/roles.ts`** (`CmsRole`, `ROLE_ORDER`, `ROLE_DESCRIPTIONS`,
`roleAtLeast()`) so the browser bundle and the server share one definition. `server/lib/userAdmin.ts`
re-exports it; never re-declare a role list.

| Role | Rank | Can |
| :--- | :--- | :--- |
| `viewer` | 0 | Read-only: dashboard, catalog, pages, changelog |
| `editor` | 1 | + catalog writes, pages, media, inquiries, taxonomies, design, trash, planning |
| `admin` | 2 | + Users and Settings (full control) |

**The `minRole` ↔ guard matrix** (every row is asserted by `src/test/adminNavGuard.test.ts`):

| Nav item (`ADMIN_NAV`) | `minRole` | Server guard | Endpoint |
| :--- | :--- | :--- | :--- |
| Dashboard, Catalog, Pages | — (all roles) | `requireAuth` / public read | — |
| **Changelog** | — (all roles) | `requireAuth` | `GET /api/plan/history` |
| Media, Inquiries, Taxonomies, Design, Trash | `editor` | `requireRole("editor")` | their own routes |
| **Planning** | `editor` | `requireAuth, requireRole("editor")` | `GET/PATCH/DELETE /api/plan/items` |
| Users, Settings | `admin` | `requireRole("admin")` | their own routes |

- **A `minRole` on a nav item must match the server guard on the matching API route.** Otherwise a
  Viewer is offered a menu item that answers `403` — the exact defect `v2.11.0` fixed for Inquiries
  and Media. `ADMIN_NAV` in `src/components/admin/AdminLayout.tsx` carries the mapping as a comment,
  and `src/test/adminNavGuard.test.ts` reads that list and `AdminApp`'s route switch **out of source**
  and fails when either direction of the relationship breaks. Two doors on one resource is legal
  *only* when the guards differ deliberately — `POST /api/plan/feedback` is public (with honeypot and
  rate limit) while `POST /api/plan/items` is `requireAuth`; that is why `server/routes/plan.ts` has
  **no** router-wide guard.
- **Gate at both ends.** Route-level `requireAuth, requireRole(...)` on the server, plus a `Forbidden`
  panel and disabled controls in the UI. Server is the authority; the UI only avoids dead ends.
- **Never let the studio lock itself out.** `decideMutation()` in `server/lib/userAdmin.ts` refuses
  self-role-change / self-deactivate / self-delete and protects the last active administrator. Do not
  add a mutation path that bypasses it.

### Guardrails

- **Conventional Commits.** Release notes in `CHANGELOG.md` (Keep a Changelog + SemVer).
- **Migrations are additive and idempotent** — `IF NOT EXISTS` / `OR REPLACE` / guarded triggers.
  Enforced by `src/test/migrationSafety.test.ts`; do not merge a migration that fails it.
- **A migration that touches a core table must sort after `2026_09_01_baseline_core_tables.sql`.**
  Never add a file dated earlier than the baseline.
- **Never overwrite non-empty DB fields during backfills** — fill only `NULL`/`''`.
- **Back up before you write** — `npx tsx scripts/backup-catalog.ts`, then follow
  [`docs/runbooks/database-backup-restore.md`](docs/runbooks/database-backup-restore.md).
- **Media is Supabase Storage only** — never reference Cloudinary in new code.
- **`api/index.js` is a tracked build artifact — do NOT untrack or "clean up" it.** It is generated
  by esbuild from `server.ts` (`npm run build:api`), but it is committed deliberately: `b5e6c3b`
  (v2.7.0) tracked it so remote Vercel CI finds the serverless function at all, and `vercel.json`
  binds both `functions["api/index.js"]` and the `/api/(.*)` rewrite to that exact path.
  ⚠️ The committed copy is **regenerated on every deploy** — `vercel.json`'s `buildCommand` runs
  esbuild straight into `api/index.js` — so a stale copy in git does **not** mean the deployed
  function is stale. Never read it to determine which routes are live.
- **Run `npm run smoke` after changing `server.ts` mounts.** It imports the app the way Vercel does
  (`VERCEL=1`), walks the route table *through* mounted routers, and invokes the endpoints that can
  be probed without a database. It exits non-zero when an endpoint is missing.
- **Email branding has one source** — `server/emailTemplates.ts`. Studio-sent mail goes through
  Resend; Supabase's own mailer is branded separately by pasting `supabase/email-templates/` into the
  dashboard (see §3 and the runbook).
- **Auth redirects must be a bare origin** (no `#`). This is a hash-router SPA and `supabase-js` parses
  the session out of the URL *fragment*; a target like `…/#/admin` silently drops the session. Use
  `bareOrigin()` (`src/lib/authRedirect.ts`) or `buildAuthRedirect()` (`server/lib/userAdmin.ts`), and
  keep `src/lib/authRedirect.ts` as the **first** import in `src/main.tsx`.
- **`tsc --noEmit` must stay clean** (`npm run lint`); `npm test` (vitest) is offline/zero-token.
  The suite is **53 test files** under `src/` (counted 2026-10-06, after `v3.2.1` added
  `src/test/navbarLinks.test.tsx`). ⚠️ **The test *count* is not
  recorded here on purpose** — it was quoted as "828 across 48 files" while the file count was
  already 52, i.e. the number rotted. Re-derive both after `npm ci`:
  `npx vitest run --reporter=dot 2>&1 | tail -5` and `find src -name '*.test.*' | wc -l`.
  ⚠️ **vitest transpiles without typechecking** — a type error in `scripts/` or `server/` passes the
  test run and is caught only by `npm run lint`. Run both.
  ⚠️ **There is no CI test job.** The repo has no `.github/workflows/` at all — the five PR checks are
  Vercel ×2, Socket ×2 and Debricked, and none of them runs the suite. A red test does **not** block
  a merge, so running both is a purely local obligation. Proven 2026-09-16: PR #37 merged while
  `src/test/releaseLogSync.test.ts` was failing (`src/data/releaseLog.generated.ts` had gone stale
  after a `DEPLOYMENT_LOG.md` edit) and every check still read `pass`.
  ⚠️ The count is stale the moment it is written. Re-derive it rather than trusting it:
  `npx vitest run --reporter=dot 2>&1 | tail -5` (and `ls src/**/*.test.* | wc -l` for the file count).
- **A new public write door must reuse `server/lib/requestGuards.ts`.** Every unauthenticated `POST`
  gets `honeypotGate()` + `rateLimit({ rule: PUBLIC_WRITE_LIMITS.<name> })`, and its budget must be
  *tighter* than any cheaper door's — `POST /api/inquiries` (which sends two Resend emails per hit) is
  the tightest at 5/30 min, not the loosest. The honeypot answers **201 with a plausible success**,
  never 400, so a bot learns nothing. An in-process `Map` is **not** a security boundary on Vercel —
  it is a speed bump; do not describe it as more.
- **A public write's identity fields come from the door, never the body.** `server/lib/planRules.ts`
  is the model: `source`, `source_ref`, `author_id`, `status` and `priority` are derived from *which
  endpoint* the request hit. A rule that reads them from the payload is a privilege-escalation bug,
  and the test that catches it belongs in the pure-rule suite, not in an integration test.
- **Generated artifacts must be reproducible.** `src/data/assetRegistry.ts` and
  `src/data/releaseLog.generated.ts` are emitted by `scripts/generate-*.ts` with an AUTO-GENERATED
  banner and **no timestamp**, so `git diff --exit-code` after a re-run is a real staleness check.
  Never hand-edit one; never add a timestamp to one.
- Verify a claim against the code before documenting it. Stale docs were this repo's largest
  liability before `v2.9.0`.

### Releases

- **Everything ships through a PR.** Push the branch, open a PR, and wait for the gates before
  merging. There are **no GitHub Actions** in this repo — the gates are a **Vercel preview
  deployment**, **Socket Security**, and **Debricked** (`Vulnerability analysis`). Merge only when
  `gh pr view <n> --json mergeStateStatus` reports `CLEAN` (`UNSTABLE` means checks are still running).
- **Tag the merge commit on `main`**, not the branch tip — that is what `v2.10.0` (`962587e`) and
  `v2.11.0` (`5122812`) do. ⚠️ `v2.9.0` is the exception: it points at a pre-merge commit
  (`16df8d9`), so its tag predates the final CHANGELOG fix. Tags are immutable once pushed; do not
  move one to "fix" it.
- **Do not delete a release branch unless asked.** Branches were pruned after `v2.9.0`/`v2.10.0`, but
  the user asked to **keep `release/v2.11.0`** (tip `467bd14`, fully merged). Check before pruning.
- **Update `DEPLOYMENT_LOG.md`** for every release — it is one row per notable deployment and it
  drifted three releases behind once already. The query to rebuild it from real data is in that file.
- **A release is not finished until the docs it invalidated are fixed.** The checklist, all four of
  which have been skipped at least once: (1) the `AGENTS.md` **header** `Verified against:` line — it
  read `v2.13.0` through three releases; (2) §6's migration count and §7's file map; (3) §9's suite
  count, which is stale the moment it is written; (4) **regenerate the derived artifacts**
  (`npx tsx scripts/generate-release-log.ts`) after the `CHANGELOG.md` edit, because the history
  screen renders the generated file, not the Markdown — a missed regeneration shows the *previous*
  release's notes, and a `[Unreleased]` heading left on a shipped section renders the whole release
  as unreleased. Both defects happened in `v3.1.0` and were found only by reading the screen back.
- `gh` is not authenticated in this shell and is not on the Bash `PATH`; call it by absolute path
  (`"/c/Program Files/GitHub CLI/gh.exe"`). ⚠️ The token is **no longer in the `origin` URL** — it was
  stripped on 2026-09-15. Borrow the one Git Credential Manager already holds instead:
  `TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')`
  then `export GH_TOKEN="$TOKEN"`. Verify with a real write, not a read: a fine-grained PAT can read
  (`ls-remote`, `gh pr list`) and still return `403 Resource not accessible by personal access token`
  on every push. ⚠️ Note the last line of the original note pointed at `GIT_REF_SANDBOX_HAZARD.md` —
  **that file is not in this repo** (verified absent), so the ref-sandbox quirk it described lives
  only in session memory. Treat it as unverified until re-established from a live observation.
