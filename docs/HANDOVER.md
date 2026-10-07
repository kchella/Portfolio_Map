# Session handover — PAR Map (ECS Maps Zambia)

For whoever works on **par-map** next, person or agent. Read this first. Last updated 2026-10-04.

> **State (2026-10-04):** the first security audit is done; see [`docs/security/SECURITY-AUDIT.md`](security/SECURITY-AUDIT.md). **Customer data is publicly readable on the live project (C1).** Its Phase 0 comes before everything in Section 4. Feature work from 2026-09-30 (Supa Partner rename, routes, admin and popup redesign) exists only in the local copy.

**What it is:** the field map for SupaMoto Zambia's loan portfolio. Customers are coloured by PAR bucket, admins manage KMZ boundary layers and buffer circles, and field teams use it on phones in Lusaka on low bandwidth.

**Owner and approver:** Chella. **Team:** Chella, Harrison, Loveness.

---

## 1. Where things are

| What | Where |
|---|---|
| Local working copy (newest code) | `C:\Users\ECSZMLPT0067\Downloads\Projects\Ticket\par-map` |
| GitHub repo (private, older) | `ECS-IT-Fintech/ECS_Maps_Zambia`. The repo's top level holds a `par-map/` subfolder. |
| Supabase project | ref `hwxinyzdssdrtmhdclor`. This is not the SupaTicket project. |
| Stack | Next.js 15 (Pages Router), React 19, TypeScript strict, Supabase (`@supabase/supabase-js` 2.x, `@supabase/ssr`), Leaflet + React-Leaflet, Mapbox tiles, Tailwind |
| Env vars (names only) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `ADMIN_PASSWORD` (unused, see 3.3) |
| Existing docs | `README.md`, `CLAUDE.md`, `RULES.md`, `ARCHITECTURE.md`, `DESIGN.md`, `CHECKLIST.md`, `scripts/README.md`. They contradict each other; see 3.4. |

---

## 2. Version control: the local copy is not under git

- **The local `par-map` folder has no `.git`.** It has no history and no backup.
- **The GitHub repo is about four months behind:** `main` was last pushed on 2026-05-18, and the newest local files are dated 2026-09-30.
- The `staging` and `Bup3K-patch-1` branches are older than `main` (April 2026). Nothing in them needs to be kept.

Compared with `main` (2026-10-04, by cloning the repo to a scratch folder):

| Only in the local copy | Only in the repo |
|---|---|
| `supabase/migrations/003_lock_down_data.sql`, `004_supa_partner.sql` | `src/pages/api/` |
| `src/utils/routing.ts`, `src/utils/supaPartners.ts`, `src/lib/safeNext.ts`, `src/styles/theme.ts`, `src/hooks/` | `next.config.js` (replaced locally by `next.config.mjs`) |
| `src/components/RouteCard.tsx`, `src/components/admin/UserManager.tsx` | |
| `CLAUDE.md`, `public/`, `.env.local` (never commit) | |

About 30 other source files differ: map, admin screens, auth, middleware, styles and helpers.

**Why the local folder can't simply become the repo:** the repo's top level is the folder *above* `par-map`. Locally, that folder (`Ticket\`) also contains SupaTicket, which has its own git repo.

---

## 3. Findings

### 3.1 Customer data is committed to git (High)
- The repo contains `par-map/scripts/Customers PAR Status.csv` and `par-map/scripts/customers_output.ts`, real customer records.
- The current `.gitignore` doesn't exclude them, so a normal commit would keep adding them.
- Untracking them stops future copies, but **past commits still contain the data**. Removing it from history means a rewrite and a force-push, which only a person runs (same rule as SupaTicket).
- **Decision needed:** rewrite the history, or accept it (the repo is private) and restrict access to the repo.

### 3.2 Migrations were applied by hand — 003 is NOT live (checked 2026-10-04)
- **Checked live:** 003 and probably 002 are missing; 004 was applied by hand on 2026-09-30. See the audit, section 3.
- Migration 003's header says "Run in Supabase Dashboard → SQL Editor", the same pattern that left SupaTicket's history out of step.
- It's unknown which of 001–004 are live, and the Supabase CLI history hasn't been checked.
- **Why it matters:** if 003 isn't live, customer data is readable by anyone holding the public anon key, and every sign-up gets the `user` role automatically (003's own header says so).

### 3.3 Stale or dead pieces
- **`ADMIN_PASSWORD`** is in `.env.local`, but no code reads it. The "admin password gate" in `RULES.md` is gone; admin access is Supabase Auth now.
- **`getSupabaseAdmin()`** in `src/lib/supabase.ts` (service-role client) is defined but never called, because the local copy has no `api/` routes. It's dead code, not a leak. Remove it or keep it, but don't call it from browser code.
- **Admin role:** enforced client-side in `useAuth.ts`, and the Edge middleware only checks that someone is signed in. Whether the database's RLS enforces admin-only writes depends on 003 being live (3.2).
- **Storage bucket:** `CLAUDE.md` says `kmz-files` is public-read, while 003 makes it private. Which is true depends on 3.2.

### 3.4 Docs contradict each other
- **Framework version:** `RULES.md` says Next.js 14 and Vercel; the code and `README.md` say Next.js 15, with a Dockerfile.
- **Admin access:** `RULES.md` describes the password gate; `CLAUDE.md` and the code use Supabase Auth.
- **Customer data:** `RULES.md` says it's weekly data in `src/data/customers.ts` via `csv_to_ts.py`. That folder was removed on 2026-05-11, and customers come from Supabase now.
- **`CHECKLIST.md`** stops at Phase 9, and says "GitHub repo created and pushed" while the local copy has no git.
- **`README.md`** uses emojis (against the shared rule) and says "MIT" licence for an internal, private app.

---

## 4. Next steps, in order

Nothing below has been started. Steps 1–3 wait on Chella's go-ahead.

1. **Clone the repo** to `C:\Users\ECSZMLPT0067\Downloads\Projects\ECS_Maps_Zambia`, next to `Ticket`. The current local folder stays untouched as a backup.
2. **Fix `.gitignore` before any commit:** exclude `.env*`, `scripts/*.csv` and `scripts/customers_output.ts`, and untrack the two customer files (`git rm --cached`).
3. **Sync the local work:** copy the local `par-map` over the clone's `par-map`, leaving out `node_modules`, `.next` and `.env.local`. Commit on `chore/sync-local-work` and open a PR. **Confirm in review** that deleting `src/pages/api/` and `next.config.js` was intended.
4. **After the merge,** work from the clone, and copy `.env.local` across as a file (never paste keys into chat).
5. **Docs restructure (second PR, no code changes),** to the same layout as SupaTicket:
   - `AGENTS.md`: the single rulebook. Merge `RULES.md` and `CLAUDE.md`; lock the stack; add the eight working practices and the one-audit-file rule. `CLAUDE.md` only points to `AGENTS.md`.
   - `README.md`: lean, correct, no emojis.
   - `CONTRIBUTING.md`: branches, commits, reviews.
   - `docs/`: this file, plus `ARCHITECTURE.md` and `DESIGN.md` (moved and corrected), `BUG_LOG.md`, `DECISIONS.md`, `DEPLOY_LOG.md`, and `HISTORY.md` (old `CHECKLIST.md` and `RULES.md`).
   - `docs/security/SECURITY-AUDIT.md`: the living register.
6. **Migration status check:** run a read-only presence query for 001–004 in the SQL Editor, then repair the CLI history the way SupaTicket's was repaired on 2026-10-04 (`--db-url`, with the password read by a hidden-input script).
7. **First security audit,** read-only, recorded in `docs/security/SECURITY-AUDIT.md` with a phased fix plan.
8. **Decide on the customer CSV in history** (3.1).

---

## 5. Environment notes (this machine)

- **Don't run `next build` while the dev server is running.** It corrupts `.next`. Check changes with `npx tsc --noEmit` and lint instead.
- **npm is broken on this laptop** (`EPERM`), so dependencies can't be installed here. Run tools directly from `node_modules`.
- **Supabase CLI access:**
  - Check which account you're signed into first (`supabase projects list`). Chella's CLI was once signed into a personal account.
  - For database commands, use `--db-url` with the session pooler, and a script that reads the password with hidden input.
  - Never paste passwords, keys or tokens into chat.
- **Practices** (from SupaTicket's `AGENTS.md`, to be adopted here):
  - Commit and push daily.
  - No hand edits to the live database; use migrations and `supabase db push`.
  - Staging first.
  - Record every deploy.
  - Fix security before features.
  - A second reviewer for database, auth and storage changes.
