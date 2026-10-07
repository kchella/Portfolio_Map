-- ─── 005: REMOVE LEFTOVER OPEN READ POLICIES ─────────────────────────────────
-- 003 added approved-only reads, but older dashboard-made policies with other
-- names ("Public read access", "Anyone can read …", "Authenticated users can
-- read customers") still say `using (true)`. Policies are OR-ed, so those kept
-- every PAR Map table readable with the anon key. Found 2026-10-04 (audit C1).
--
-- This Supabase project is SHARED with other apps (ac_customers, acs,
-- logistics_*). This script only touches PAR Map's four tables and the
-- kmz-files bucket.
--
-- Run the PREVIEW first; it changes nothing. Then run from BEGIN to COMMIT.

-- ── PREVIEW (read-only) ──────────────────────────────────────────────────────
-- select schemaname, tablename, policyname, cmd, roles, qual
-- from pg_policies
-- where (schemaname = 'public'
--        and tablename in ('customers', 'kmz_layers', 'buffer_layers', 'teams')
--        and cmd = 'SELECT' and qual = 'true')
--    or (schemaname = 'storage' and tablename = 'objects'
--        and coalesce(qual, '') || coalesce(with_check, '') like '%kmz-files%'
--        and policyname not in ('kmz-files approved read', 'kmz-files admin insert',
--                               'kmz-files admin update', 'kmz-files admin delete'));

begin;

-- 1. App tables: drop every SELECT policy that lets anyone read ──────────────
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('customers', 'kmz_layers', 'buffer_layers', 'teams')
      and cmd = 'SELECT' and qual = 'true'
  loop
    raise notice 'dropping public.% policy "%"', p.tablename, p.policyname;
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- 003's approved-only read must exist on each table (re-created if missing).
drop policy if exists "Approved read customers" on public.customers;
create policy "Approved read customers" on public.customers for select using (public.has_map_access());
drop policy if exists "Approved read kmz_layers" on public.kmz_layers;
create policy "Approved read kmz_layers" on public.kmz_layers for select using (public.has_map_access());
drop policy if exists "Approved read buffer_layers" on public.buffer_layers;
create policy "Approved read buffer_layers" on public.buffer_layers for select using (public.has_map_access());
drop policy if exists "Approved read teams" on public.teams;
create policy "Approved read teams" on public.teams for select using (public.has_map_access());

-- 2. Storage: drop kmz-files policies other than 003's four ──────────────────
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and coalesce(qual, '') || coalesce(with_check, '') like '%kmz-files%'
      and policyname not in ('kmz-files approved read', 'kmz-files admin insert',
                             'kmz-files admin update', 'kmz-files admin delete')
  loop
    raise notice 'dropping storage.objects policy "%"', p.policyname;
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- A public bucket serves files by URL with no policy check at all.
update storage.buckets set public = false where id = 'kmz-files' or name = 'kmz-files';

commit;

-- ── AFTER (read-only) — should list only has_map_access() reads ─────────────
-- select tablename, policyname, cmd, qual from pg_policies
-- where schemaname = 'public' and tablename in ('customers', 'kmz_layers', 'buffer_layers', 'teams')
-- order by tablename, cmd;
-- select id, name, public from storage.buckets where id = 'kmz-files' or name = 'kmz-files';
