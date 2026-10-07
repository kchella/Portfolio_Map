# Security audit — PAR Map (ECS Maps Zambia)

The living security register for **par-map**. Add new findings here and update each one's status as it is fixed; don't start a second audit file.

| | |
|---|---|
| **First audit** | 2026-10-04 |
| **Approved by** | Chella |
| **Scope** | Next.js app (`src/`), middleware, Supabase migrations, the live Supabase project (`hwxinyzdssdrtmhdclor`), storage, auth settings, Dockerfile, dependencies, third-party services |
| **Method** | Read-only. Code review, plus requests to the live project using **only the public anon key** (the same key every browser receives). Nothing was written, changed or deleted. |

---

## 1. Summary

**The customer database is open to the internet.** Anyone with the public anon key — which is inside the JavaScript every visitor downloads — can read every customer's name, both phone numbers, PAR status and home GPS location, without logging in. This was verified on the live project.

The fix already exists in the repo (`003_lock_down_data.sql`) but **was never applied to the live database**. The live schema shows that 003 is missing entirely and 002 appears missing too, while 004 (applied by hand on 2026-09-30) is live.

| Severity | Count | Verified live |
|---|---|---|
| Critical | 2 | 1 verified, 1 must be checked (C2) |
| High | 4 | 2 verified |
| Medium | 6 | — |
| Low | 6 | — |

**Do Phase 0 (section 4) before any feature work.**

---

## 2. Findings

Status key: **Open**, **In progress**, **Fixed** (with date and PR), **Accepted** (with who accepted and why).

### C1 — Customer personal data readable without login · Critical · **Fixed 2026-10-04** (003 + 005, run by Chella)

**Evidence (2026-10-04, anon key only):**
- `GET /rest/v1/customers` returned rows. `Prefer: count=exact` reported **1,621 rows**.
- Columns returned: `contract_ref, name, phone, phone2, area, par_status, supa_partner_code, supa_partner_name, latitude, longitude, supa_partner_latitude, supa_partner_longitude, week_label, created_at`.
- `kmz_layers` (20 rows), `buffer_layers` (2) and `teams` (8) are also readable.
- `profiles` returned an empty list, so that table's row-level security (RLS) is working.

**Impact:** names, phone numbers, home locations and arrears status of every mapped customer can be scraped by anyone, in one request, with no account. This is personal and financial data under Zambia's Data Protection Act 2021.

**Cause, confirmed 2026-10-04 from `pg_policies`:** after 003 was applied, older dashboard-made policies were still in place. Policies are OR-ed, so each one alone keeps a table open:
- `customers`: "Public read access" (anon, `true`) and "Authenticated users can read customers" (role `public`, `true`), which despite its name includes anon.
- `kmz_layers`: "Public read access" and "Anyone can read kmz_layers".
- `buffer_layers`: "Public read access" and "Anyone can read buffer_layers".

`005_remove_open_reads.sql` drops them.

**Original cause:** the read policies are still "public read" (from 002 or created in the dashboard). Migration 003 replaces them with approved-only reads, but it isn't live: `has_map_access()` doesn't exist, and `profiles.email` and `profiles.role_request` (added by 003) don't exist.

**Fix:** Phase 0, steps 1–4.

### C2 — Write access to data may also be open · Critical · **Not an issue** (checked 2026-10-04)

**Result from `pg_policies` (2026-10-04):** writes on `customers`, `kmz_layers` and `buffer_layers` are covered only by "Admins can write …" policies (`FOR ALL`, `exists (select 1 from profiles where id = auth.uid() and role = 'admin')`). No permissive write policy was found. The live admins are `chella@supamoto.global` and `fintech@supamoto.global`. `teams` was cut off in the output; confirm with the AFTER query in `005`.

*Original concern, kept for the record:*

**Evidence:** `rpc/is_admin` returned "function not found", so 002's `is_admin()` is not live. Every admin-only write policy in 002 and 003 depends on that function, so **the live write policies are not the ones in the repo**. Yet admins can upload and clear customers from the browser, so some policy (or RLS being off) allows writes. If it allows anon or any signed-in user, anyone can delete or alter all customers, layers and teams.

This was **not** tested live, because testing it means writing to production. Check it with the read-only query in section 5.

**Fix:** Phase 0.

### H1 — Storage bucket is public and listable · High · **Fixed 2026-10-04** (005)

**Evidence:** with the anon key, `POST /storage/v1/object/list/kmz-files` listed **22 files**, and a file downloaded with status 200 from both the authenticated endpoint and the public URL (`/object/public/kmz-files/...`).

**Impact:** all boundary KMZ files and buffer GeoJSON (for example "Warehouse (2km)", which reveals warehouse locations) can be downloaded by anyone.

**Fix:** 003 section 6 sets the bucket private and adds approved-read and admin-write policies. Older dashboard policies must also be removed (section 5, query 3).

### H2 — Anyone can sign up and is confirmed instantly · High · Verified (settings) · Open

**Evidence:** `GET /auth/v1/settings` shows `disable_signup: false`, `mailer_autoconfirm: true`, and email and Google sign-in enabled.

**Impact:** anyone can create an account with **any** email address, including a staff member's, without proving they own it. Under 002's trigger, new accounts get the `user` role and immediate map access. Under 003 they would be `pending`, which is safe, but an attacker could still pose as a real employee while waiting for approval.

**Fix:**
- Turn on **Confirm email** (Authentication → Providers → Email).
- Apply 003 so new accounts start as `pending`.
- Optionally restrict Google sign-in to the company domain.

### H3 — Real customer data in the GitHub repo history · High · Open

From the handover (3.1): `scripts/Customers PAR Status.csv` and `scripts/customers_output.ts` are committed in `ECS-IT-Fintech/ECS_Maps_Zambia`. Both files are still in the local `scripts/` folder, and `.gitignore` doesn't exclude them.

**Fix:**
- Add both files to `.gitignore` and untrack them before any new commit.
- Decide whether to rewrite the history (force-push, run by a person) or accept the risk because the repo is private, and limit repo access.
- Delete the local copies once they are no longer needed.

### H4 — No version control or backup of the working code · High · Open

From the handover (section 2): the local copy has no `.git`, and GitHub is about four months behind. A lost or broken laptop means all recent work, including the security fixes, is lost.

**Fix:** handover steps 1–3 (clone, `.gitignore`, sync PR).

### M1 — Database changed by hand; live schema has drifted · Medium · Open

- 004 is live but 002 and 003 are not. Migrations have been run out of order, by hand, in the SQL Editor.
- The live `customers` table has a `week_label` column that no migration creates.

**Impact:** the repo doesn't describe the real database, so reviews of RLS in the repo give false assurance. This is how C1 went unnoticed.

**Fix:** capture the live schema as a baseline migration, repair the Supabase CLI history, and apply all future changes only through migrations (`supabase db push`), with a second reviewer for database, auth and storage changes.

### M2 — Customer and partner GPS sent to third parties · Medium · Open

Added on 2026-09-30 (route feature):
- **"Route to Supa Partner"** sends the customer's and the partner's coordinates to `routing.openstreetmap.de` (FOSSGIS, Germany), three requests per click.
- **"Start navigation"** opens Google Maps with both coordinate pairs.
- **The WhatsApp button** opens `wa.me` with the customer's number.
- Mapbox receives only tile requests, not customer data.

**Impact:** the coordinates aren't labelled with names, but a home location plus the context is personal data leaving the organisation.

**Fix:** decide what's acceptable. Options:
- Self-host OSRM or proxy the requests through our own server.
- Round the coordinates sent to the router.
- Record the processing in the data-protection register.

The Google Maps and WhatsApp hand-offs are user-initiated and usually acceptable, but record them.

### M3 — No Content-Security-Policy · Medium · Open

`next.config.mjs` already sets HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy and Permissions-Policy, which is good. There's no CSP, so an injected script would run freely and could read the session.

**Fix:** add a CSP allowing `self`, the Supabase URL, `api.mapbox.com`, `routing.openstreetmap.de` and Google Fonts.

### M4 — Weekly upload deletes everything first, from the browser · Medium · Open

`syncCustomers()` deletes every customer and then inserts the new rows in chunks, from the browser, with no transaction. On 2026-09-30 an insert failed after the delete and **emptied the live table** (since fixed to check the schema first). A dropped connection mid-upload still causes the same loss. There's also no record of who uploaded or cleared data.

**Fix:** move the sync into a database function (load a staging table, swap in one transaction), admin-only, and write an audit row (who, when, row count).

### M5 — "Forgot password" doesn't send anything · Medium · Open

`forgot-password.tsx` shows "We've sent reset instructions" without calling Supabase, and there's no page to set a new password.

**Impact:** locked-out staff can't recover their accounts, which pushes people toward sharing passwords.

**Fix:** call `resetPasswordForEmail`, and add an update-password page.

### M6 — Container runs Node 20 (end of life) as root · Medium · Open

The `Dockerfile` uses `node:20-alpine`, and Node 20 stopped getting security updates in April 2026. There's no `USER` line, so the server runs as root inside the container.

**Fix:** move to `node:22-alpine` (LTS), and add `USER node` in the runner stage.

### L1 — Redirect check can be bypassed with tab or newline characters · Low · Open

`safeNext()` blocks `//evil.com` and `/\evil.com`, but browsers strip tab and newline characters from URLs, so `/%09/evil.com` becomes `//evil.com` after the check.

**Fix:** reject any control character, and resolve the path with `new URL(raw, origin)`, accepting it only if the origin is unchanged.

### L2 — Middleware lets requests through when the auth check fails · Low · Open

`middleware.ts` catches errors and lets the request through ("fail open"). That's tolerable only while RLS protects the data, which it currently doesn't (C1).

**Fix:** after C1 is fixed, leave as is or redirect to `/login` on error.

### L3 — Map layer toggles write shared settings · Low · Open

- On `/map`, toggling a stored layer calls `toggleLayerVisibility`, which changes `kmz_layers.visible` **for everyone**.
- For non-admins the write is blocked (once RLS is right) and the toggle reverts, so viewers can't hide layers for themselves.
- Buffer-layer toggles call the `kmz_layers` function with a `buffer_layers` id.

**Fix:** keep per-user visibility in browser storage, and leave the shared flag to admins in the admin panel.

### L4 — Unused secrets on the laptop · Low · Open

`.env.local` holds `SUPABASE_SERVICE_ROLE_KEY` (full database access, bypasses RLS) and `ADMIN_PASSWORD`, but no code uses either: there are no `api/` routes, and `getSupabaseAdmin()` is never called. The service key isn't in the browser bundle, because Next.js only exposes variables starting with `NEXT_PUBLIC_`.

**Fix:** remove both from `.env.local` and delete `getSupabaseAdmin()` until a server route needs it. Rotate the service key if the laptop's files were ever shared.

### L5 — Dependency audit not run · Low · Open

`npm audit` can't run on this laptop (npm EPERM).

| Package | Installed version |
|---|---|
| next | 15.5.14 |
| react | 19.2.4 |
| @supabase/supabase-js | 2.103.0 |
| @supabase/ssr | 0.10.2 |
| jszip | 3.10.1 |
| papaparse | 5.5.3 |
| leaflet | 1.9.4 |

Next 15.5.14 already includes the fixes for the 2025 middleware-bypass (CVE-2025-29927) and React Server Components advisories. `package.json` uses `^` ranges.

**Fix:** run `npm audit` in CI on every PR, and add Dependabot.

### L6 — Mapbox token is public · Low · Open

`NEXT_PUBLIC_MAPBOX_TOKEN` is in the browser by design.

**Fix:** in the Mapbox account, restrict the token to the app's domains and give it only tile scopes.

### N1 — Shared Supabase project: one login system, unprefixed tables · Medium · Open

The project hosts several apps by design, each with its own name-prefixed tables (`ac_*`, `logistics_*`, and so on; confirmed by Chella 2026-10-04). Isolating tables by name is fine. What the apps still share:
- **One `auth.users` table.** PAR Map's `handle_new_user` trigger runs for **every** sign-up in the project, from any app, and creates a PAR Map profile. Since 003 that profile is `pending`, which is safe. Under 002 it was `user`, so a sign-up for another app got PAR Map access. Anyone with an account in another app can also sign in to PAR Map; they land as `pending`.
- **One anon key and one service-role key.** A permissive policy in any app, or a leaked service key (L4), affects all of them. For example, `acs.acs_select_all` allows `{anon, authenticated}` to read using `true`. That's for its owners to judge; it may be intentional reference data.
- **PAR Map's tables aren't prefixed** (`customers`, `profiles`, `teams`, `kmz_layers`, `buffer_layers`). It's easy for another app's code or migration to touch them by mistake.

**Fix:**
- Prefix PAR Map's tables (for example `par_customers`) in a future migration. That needs matching code changes.
- Have the trigger create a profile only for sign-ups that came from PAR Map (for example when `raw_user_meta_data->>'app' = 'par-map'`), or let admins create PAR Map profiles themselves.
- A database reviewer should know every app in the project.

### What is already done well

- **No unsafe HTML.** No `dangerouslySetInnerHTML`. Map tooltips use text nodes, so uploaded KMZ and CSV names can't inject script.
- **Redirect targets are checked** (`safeNext`), apart from L1.
- **OAuth uses the PKCE flow**, with one shared browser client.
- **The service-role key never reaches the browser.**
- **Good security headers:** HSTS, frame-blocking, `nosniff`, Referrer-Policy and Permissions-Policy.
- **External links** use `rel="noopener noreferrer"`.
- **003's design is correct:** pending-by-default sign-ups, approved-only reads, admin-only writes, a private bucket, and `search_path` pinned on its SECURITY DEFINER functions. It just needs to be live.

---

## 3. Status of migrations on the live project (2026-10-04)

| Migration | Live? | Evidence |
|---|---|---|
| 001 | Unknown | `kmz_layers` exists |
| 002 | **Probably not** | `is_admin()` not found |
| 003 | Yes, as of 2026-10-04, but not effective | Applied by Chella 2026-10-04. Older open policies still OR-ed with it, so data was still public; `005` removes them |
| 005 | Yes, 2026-10-04 | Leftover open reads and extra `kmz-files` policies removed; anon re-check clean |
| 004 | Yes | Applied by hand 2026-09-30; `supa_partner_*` columns exist |
| (none) | — | `customers.week_label` exists but no migration creates it |

---

## 4. Fix plan

### Phase 0 — Contain the exposure (today)

A second person reviews each database step before it's run.

1. **Inspect** (read-only): run the queries in section 5. Save the output in this file under "Phase 0 log".
2. **Confirm at least one admin:** query 2 must show at least one `admin` row with the right email. Otherwise, after the lock-down no one can manage data. Set one first if needed.
3. **Apply the lock-down.** Run `003_lock_down_data.sql` as written (it's safe to re-run and creates `is_admin()` itself). Then drop every older permissive policy listed by queries 1 and 3 that 003 doesn't replace, for example any `using (true)` read or write policy.
4. **Turn on Confirm email** in Supabase Auth (H2).
5. **Verify** by repeating the anon checks. All of these should come back empty or denied:
   - `customers`, `kmz_layers`, `buffer_layers` and `teams` return `[]`;
   - storage list returns `[]` or an error;
   - the public file URL returns 400 or 404.

   Then sign in as a normal user to confirm the map still works, and as an admin to confirm uploads still work.
6. **Review accounts:** use query 2 to demote anyone who shouldn't see customer data to `pending`.

### Phase 1 — Get the code and database under control (this week)

- Git: handover steps 1–3 (H4), with `.gitignore` covering the customer files (H3).
- Decide on rewriting the history (H3).
- Baseline the live schema and repair the CLI migration history (M1).
- Remove the unused secrets (L4).

### Phase 2 — Harden (next two weeks)

- Atomic, audited customer sync (M4).
- Real password reset (M5).
- CSP (M3).
- `safeNext` fix (L1).
- Node 22 and a non-root container (M6).
- Per-user layer visibility (L3).
- `npm audit` and Dependabot in CI (L5).
- Mapbox token restrictions (L6).

### Phase 3 — Privacy

- Decide on and document the third-party data flows (M2).
- Consider whether viewers need phone numbers for every customer, or only for their own team's area.

---

## 5. Read-only checks for the SQL Editor

Run these in the Supabase SQL Editor (they only read). Paste the results into the Phase 0 log.

```sql
-- 1. Every policy on app tables
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, cmd;

-- 2. Accounts and roles (columns that exist before 003)
select p.id, u.email, p.role, u.created_at, u.email_confirmed_at
from public.profiles p join auth.users u on u.id = p.id
order by u.created_at;

-- 3. Storage policies and bucket flag
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'storage' and tablename = 'objects';
select id, public from storage.buckets;

-- 4. Is RLS on for each table?
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r';

-- 5. Which helper functions exist
select proname, prosecdef, proconfig from pg_proc
where pronamespace = 'public'::regnamespace;
```

---

## 6. Phase 0 log

*(Record each step here: date, who ran it, who reviewed it, result.)*

- **2026-10-04, Chella:** ran `003_lock_down_data.sql`. Re-check with the anon key: all four tables were still readable and storage was still listable. Cause: the leftover open policies (C1).
- **2026-10-04:** admins confirmed as `chella@supamoto.global` and `fintech@supamoto.global`; there are no other accounts.
- **2026-10-04, Chella:** ran `005_remove_open_reads.sql`.
- **2026-10-04, re-check with the anon key:**
  - `customers`, `kmz_layers`, `buffer_layers`, `teams` and `profiles` all return 0 rows (`Content-Range: */0`).
  - The storage list returns `[]`.
  - File downloads return 400 on both the public and the signed-in endpoint, with the CDN bypassed. Cloudflare may still serve already-cached copies for up to its cache lifetime (about an hour).
  - **C1 and H1 are closed.**
- **Still open from Phase 0:** turn on **Confirm email** (H2; `mailer_autoconfirm` is still `true`). Also sign in as an admin and as a viewer to confirm the map and uploads still work.
