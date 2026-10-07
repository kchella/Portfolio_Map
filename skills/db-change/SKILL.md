---
name: db-change
allowed-tools: Bash, Read, Grep, Glob, Write, Edit
description: "Run /db-change before writing or applying anything that changes the live Supabase project for PAR Map: a migration, an RLS policy, a trigger or function, the kmz-files storage bucket, or an Auth dashboard setting. Also use it when someone reports data is visible to the wrong people, or a 'migration ran but nothing changed'. Walks the safe path for a shared, production-only database: read the live state, write an idempotent migration with a preview, hand it to Chella to run, then prove the result with the anon key and log it."
---

# db-change

The safe path for changing PAR Map's database. The Supabase project is
**shared with other SupaMoto apps and has no staging copy**, so every change
here is a production change for more than one app.

Two mistakes this skill exists to prevent, both real:
- **PM-001:** code shipped before its migration; the weekly import deleted
  every customer, then failed to insert.
- **PM-002:** the lock-down migration ran ("Success. No rows returned") but
  the data stayed public, because older `using (true)` policies were still
  OR-ed with the new ones.

## Rules

- **Agents never run SQL, change policies or change dashboard settings on
  the live project** unless Chella asks. You write the migration and the
  checks; Chella runs them in the SQL Editor (`AGENTS.md`, Environment).
- **Read-only requests with the public anon key are allowed** at any time.
  They're what every browser can already do.
- **Touch only PAR Map's objects:** `customers`, `profiles`, `kmz_layers`,
  `buffer_layers`, `teams`, the `kmz-files` bucket, and the functions
  `is_admin()`, `has_map_access()` and `handle_new_user()`. Never alter
  `ac_*`, `logistics_*` or other apps' tables.
- **Never trust a migration file, an agent's report or "Success"** as proof.
  Proof is `pg_policies` output plus an anon-key re-test.
- **Never write or paste keys, passwords or tokens** in chat, files or
  commands you show.

## Steps

### 1. Read the live state first

The repo doesn't describe the live database (audit M1). Before writing
anything, get the facts:

- **What the anon key can see** (run it yourself, read-only): the re-test
  script in `docs/security/SECURITY-DEPLOY-RUNBOOK.md`.
- **What the policies really are:** hand Chella the read-only queries in
  `docs/security/SECURITY-AUDIT.md` §5, **one at a time**. The SQL Editor
  only shows the last result.
- **Which columns exist:** `select <column> from <table> limit 0` with the
  anon key returns `42703` if a column is missing. That's useful to tell
  whether a migration ran.

Write down what you found. That's your "before".

### 2. Write the migration

- **File:** `supabase/migrations/NNN_description.sql`. Agree the number
  with the team before writing it. Never edit a migration that has been
  applied; write a higher-numbered one.
- **Header comment:** what's wrong (with evidence), what the fix does, that
  the project is shared, and how to verify and roll back. Use `005` as the
  model.
- **Idempotent:** `create or replace`, `if not exists`,
  `drop policy if exists`.
- **Destructive or bulk steps get a PREVIEW:** a commented read-only query
  at the top listing exactly what will be dropped or changed, scoped to PAR
  Map's tables.
- **Policies are OR-ed.** To tighten access, **drop** the loose policies,
  not just add a strict one. Find them by condition (for example
  `cmd = 'SELECT' and qual = 'true'`), not only by name, because dashboard
  names vary.
- **SECURITY DEFINER functions** pin `set search_path = public`.
- **New tables:** RLS on, reads via `public.has_map_access()`, writes via
  `public.is_admin()`.
- **Wrap it in `begin; … commit;`** so it applies fully or not at all.
- **Add an AFTER block:** commented read-only queries that show the
  intended end state.

### 3. Order it against the code

If application code depends on the migration, the **migration goes live
first**, then the code merges (PM-001). Say this in the PR. If the code must
work on both schemas for a while, make it detect the schema before doing
anything destructive (see `hasSupaPartnerColumns()` in
`src/lib/customerService.ts`).

### 4. Hand it over

Give Chella, and the second reviewer (Harrison or Loveness), in this order:
1. the PREVIEW query, and what its output should contain;
2. the file to run from `begin;` to `commit;`;
3. the AFTER queries;
4. a check that **at least one `admin` exists**, if the change touches
   roles or `is_admin()`. Otherwise nobody can manage data afterwards.

### 5. Prove it

- Re-run the anon-key re-test. For storage, add a cache-buster
  (`?cb=<random>`); Cloudflare serves cached copies for up to about an hour
  (PM-003).
- Compare the AFTER output with what you expected.
- Ask Chella to sign in as an admin and as a viewer and confirm the map and
  admin still work.
- If the result isn't what you expected, **stop**. Find out why (usually a
  leftover policy) before writing anything else.

### 6. Record it

- `docs/DEPLOY_LOG.md`: date, migration file, who ran it, the result of the
  re-test.
- `docs/security/SECURITY-AUDIT.md`: if it fixes a finding, update the
  finding's heading and the §4 checklist, and add the evidence.
- `docs/ARCHITECTURE.md`: update the database table and the migration list.
- `docs/BUG_LOG.md`: if it fixes a bug, add a `PM-NNN` entry.
- `AGENTS.md`, Environment quick reference: update the "live state" line.

## Done when

- The migration file is in the repo, idempotent, with a header, PREVIEW and
  AFTER.
- Chella ran it, and the anon-key re-test and AFTER queries match the
  intended state.
- Admin and viewer sign-ins still work.
- The deploy log, and the audit, architecture and bug log if relevant, are
  updated in the same PR.
