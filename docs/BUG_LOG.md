# Bug log

Every real bug gets a numbered entry here before it's fixed (AGENTS.md,
non-negotiable 10). IDs are `PM-NNN`, in order, never reused. Leave a
short comment at the fix site naming the entry.

Each entry: where, what broke, root cause with evidence, fix, how it was
verified, and how to prevent it.

---

## PM-001 — Failed weekly import emptied the live customers table

- **Date:** 2026-09-30
- **Where:** `src/lib/customerService.ts`, `syncCustomers()`
- **What broke:** importing the weekly CSV showed "Insert failed at row 0:
  Could not find the 'supa_partner_code' column". Afterwards the map
  showed no customers at all.
- **Root cause:** `syncCustomers()` deletes every customer first, then
  inserts the new rows. The code had been updated to write the
  `supa_partner_*` columns (migration 004), but 004 hadn't been applied
  yet. The delete succeeded and the insert failed. Nothing is
  transactional, so there was no rollback.
- **Fix:** `syncCustomers()` now checks the schema
  (`hasSupaPartnerColumns()`) **before** deleting. On the old schema it
  writes the legacy `lead_generate*` columns instead and reports that
  partner GPS wasn't saved. The customers were restored by re-importing.
- **Verified:** import on the old schema succeeded with a "GPS not saved"
  note; after 004, the import wrote partner GPS (342 of 1,621 rows).
- **Still open:** a dropped connection mid-insert can still leave the
  table empty. The real fix is one transaction in a database function
  (audit M4).
- **Prevent:** apply migrations before merging code that depends on them
  (`CONTRIBUTING.md`, Migrations step 8).

## PM-002 — Customer data public after the lock-down migration ran

- **Date:** 2026-10-04
- **Where:** live Supabase policies on `customers`, `kmz_layers`,
  `buffer_layers`, `teams`; `kmz-files` bucket
- **What broke:** after `003_lock_down_data.sql` ran successfully, an
  anon-key request still returned customer rows, and storage files could
  still be listed and downloaded.
- **Root cause:** older dashboard-made policies under other names ("Public
  read access", "Anyone can read …", "Authenticated users can read
  customers") said `using (true)`. Postgres ORs permissive policies, so any
  one of them keeps a table open, whatever 003 added. Evidence: the
  `pg_policies` output pasted by Chella on 2026-10-04.
- **Fix:** `005_remove_open_reads.sql` drops every `SELECT … using (true)`
  policy on PAR Map's four tables and every non-003 `kmz-files` storage
  policy, re-asserts the approved-only reads, and makes the bucket
  private.
- **Verified:** anon-key re-check on 2026-10-04: all tables return
  `Content-Range: */0`, the storage list is `[]`, downloads return 400
  (cache bypassed).
- **Prevent:** after any RLS or storage change, test with the anon key;
  never accept "Success. No rows returned" as proof (AGENTS.md, working
  practice 3).

## PM-003 — Storage downloads still returned 200 after the bucket went private

- **Date:** 2026-10-04
- **Where:** `kmz-files` public URLs, behind Cloudflare
- **What broke:** right after 005, downloading a known file still returned
  200, which looked like the fix had failed.
- **Root cause:** not a code bug. Cloudflare served copies it had cached
  while the bucket was public. The same request with a cache-busting
  query string returned 400 (`CF-Cache-Status: DYNAMIC`).
- **Fix:** none needed; cached copies expire within the cache lifetime
  (about an hour).
- **Prevent:** when testing storage access changes, always add a
  cache-buster (`?cb=<random>`).

## PM-004 — Dev server served a missing `_document.js`

- **Date:** 2026-09-30
- **Where:** `.next/` build output
- **What broke:** a runtime error "ENOENT … `.next/server/pages/_document.js`".
- **Root cause:** a second `next dev` was started in the same folder while
  the user's dev server was running. Both wrote to `.next/`.
- **Fix:** stop the servers, delete `.next/`, restart once.
- **Prevent:** one dev server per checkout; never `next build` or a second
  `next dev` while one is running.

## PM-005 — Startup warnings: wrong workspace root, untyped ES module config

- **Date:** 2026-09-30
- **Where:** `next.config.js`; a stray `package-lock.json` in the parent
  folder
- **What broke:** `npm run dev` warned that Next.js had inferred the
  wrong workspace root, and re-parsed the config as an ES module.
- **Root cause:** a `package-lock.json` in `Ticket/` made Next.js pick the
  wrong root, and `next.config.js` used `export default` without
  `"type": "module"`.
- **Fix:** renamed the config to `next.config.mjs` and set
  `outputFileTracingRoot` to the project folder.
- **Verified:** dev server starts with no warnings (ready in 3.2 s instead
  of 11.3 s).

## PM-006 — Sign-in screens showed a white page around the dark card in production

- **Date:** 2026-10-08
- **Where:** `src/components/auth/AuthShell.tsx` (page styles),
  `src/pages/auth/callback.tsx`; `src/styles/globals.css`
- **What broke:** after PR #3 deployed, `/login` on
  ecs-maps-zambia.vercel.app showed the dark card on a white page. The
  local dev server showed it on the dark canvas as designed.
- **Root cause:** `globals.css` sets `body { background: #ffffff }` for
  the whole app, and the sign-in screens set `body { background: #101010 }`
  in a `<style>` tag. Both selectors have the same weight, so the one
  loaded last wins. In development the page's tag came last; in the
  production build the global stylesheet did.
- **Fix:** the sign-in styles use `html body` (heavier than `body`), and
  the `<main>` wrapper paints the canvas itself, so the result no longer
  depends on load order.
- **Verified:** production build of the branch (see PR).
- **Prevent:** a page-level style that overrides `globals.css` must use a
  heavier selector or style its own wrapper; check new screens on a
  production build or Vercel preview, not only the dev server.
