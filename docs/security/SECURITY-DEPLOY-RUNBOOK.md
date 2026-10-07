# Security deploy runbook

How to apply, verify and roll back each security fix on the live project.
Fix **status** is tracked in `SECURITY-AUDIT.md`, not here. Log every step
you run in `docs/DEPLOY_LOG.md`.

The Supabase project is **shared with other apps** and is production; there
is no staging. Every step below needs a second person reading along
(working practice 8).

---

## The anon-key re-test (use after every step)

Run from the project folder, where `.env.local` has the public URL and anon
key. It needs no login and changes nothing.

```bash
set -a; . ./.env.local; set +a
U=$NEXT_PUBLIC_SUPABASE_URL; K=$NEXT_PUBLIC_SUPABASE_ANON_KEY
for t in customers kmz_layers buffer_layers teams profiles; do
  printf "%-14s " $t
  curl -s -I -H "apikey: $K" -H "Authorization: Bearer $K" -H "Prefer: count=exact" \
    "$U/rest/v1/$t?select=id" | grep -i content-range
done
curl -s -H "apikey: $K" -H "Authorization: Bearer $K" -X POST \
  "$U/storage/v1/object/list/kmz-files" -H "Content-Type: application/json" -d '{"prefix":"","limit":3}'
curl -s -o /dev/null -w "download: %{http_code}\n" \
  "$U/storage/v1/object/public/kmz-files/<a-known-file>?cb=$RANDOM"   # cache-buster: see PM-003
```

**Expected after the lock-down:** every table `*/0`, the storage list `[]`,
and the download `400`.

---

## 003 — Lock down data (C1, H1) · Applied 2026-10-04

**Before:** run query 2 in `SECURITY-AUDIT.md` §5. **At least one `admin`
must exist**, or nobody can manage data afterwards.

**Apply:** run `supabase/migrations/003_lock_down_data.sql` in the SQL
Editor, from the file.

**What it changes:**
- adds the `pending` role and makes it the default;
- adds `profiles.email`, `role_request` and `created_at`;
- adds `is_admin()` and `has_map_access()`;
- approved-only reads on the four tables;
- private `kmz-files` bucket with approved-read and admin-write policies.

**Verify:** the anon re-test. If tables are still readable, older policies
remain; go to 005.

**Roll back:** no clean rollback, and none should be needed. To restore
access for a locked-out admin, run `update public.profiles set role =
'admin' where email = '…';` as the project owner.

## 005 — Remove leftover open reads (C1, H1) · Applied 2026-10-04

**Before:** run the PREVIEW query at the top of
`005_remove_open_reads.sql`. It must list only PAR Map tables and
`kmz-files` policies.

**Apply:** run the file from `begin;` to `commit;`. Notices list each
dropped policy.

**Verify:** the anon re-test (expect all closed), the AFTER queries at the
bottom of the file, then sign in as an admin and check that customers and
layers load, and that an upload still works.

**Roll back:** re-create a dropped policy from the PREVIEW output. Only do
this deliberately; those policies are what made the data public.

## Confirm email (H2) · Not yet done

**Apply:** Supabase dashboard → Authentication → Providers → Email →
enable **Confirm email**.

**Verify:** `curl -s -H "apikey: $K" "$U/auth/v1/settings"` shows
`"mailer_autoconfirm":false`. Register a test address and check it can't
sign in until the link is clicked.

**Roll back:** turn the setting off.

**Watch:** Supabase's built-in email sender is rate-limited. If staff
don't receive confirmation emails, set up custom SMTP.

---

## Not yet written (from the audit fix plan)

Each needs its own section here when its fix is ready:
- M4 atomic import (a database function and migration);
- M3 Content-Security-Policy (`next.config.mjs`);
- M6 Node 22 + non-root (`Dockerfile`);
- L4 removing unused secrets (`.env.local`, Vercel env).
