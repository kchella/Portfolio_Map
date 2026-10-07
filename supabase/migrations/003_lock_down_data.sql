-- ─── 003: LOCK DOWN CUSTOMER DATA ────────────────────────────────────────────
-- Before this migration every table was readable by anyone holding the anon
-- key (which ships in the browser bundle), and every sign-up — email or
-- Google — was auto-granted the 'user' role.
--
-- After it:
--   • New accounts start as 'pending' and see nothing until an admin approves.
--   • Only approved accounts ('user' or 'admin') can read map data.
--   • Only admins can write data or change roles.
--   • The kmz-files storage bucket is private: approved read, admin write.
--
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run.

-- 1. Roles: add 'pending' and make it the default ──────────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'user', 'pending'));
alter table public.profiles alter column role set default 'pending';

-- Admins need to see who they are approving.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role_request text;
alter table public.profiles add column if not exists created_at timestamptz default now();

update public.profiles p
set email = u.email,
    role_request = coalesce(p.role_request, u.raw_user_meta_data->>'role_request'),
    created_at = coalesce(p.created_at, u.created_at)
from auth.users u
where p.id = u.id;

-- 2. Helpers (search_path pinned — required for SECURITY DEFINER) ──────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.has_map_access()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role in ('admin', 'user') from public.profiles where id = auth.uid()), false);
$$;

-- 3. New sign-ups start as pending ────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, role_request, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    new.raw_user_meta_data->>'role_request',
    'pending'
  );
  return new;
end;
$$;

-- 4. Profiles: admins can list and approve ────────────────────────────────────
drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- 5. Replace public reads with approved-only reads ────────────────────────────
drop policy if exists "Public read customers" on public.customers;
drop policy if exists "Approved read customers" on public.customers;
create policy "Approved read customers" on public.customers
  for select using (public.has_map_access());

drop policy if exists "Public read" on public.kmz_layers;
drop policy if exists "Approved read kmz_layers" on public.kmz_layers;
create policy "Approved read kmz_layers" on public.kmz_layers
  for select using (public.has_map_access());

drop policy if exists "Public read buffer_layers" on public.buffer_layers;
drop policy if exists "Approved read buffer_layers" on public.buffer_layers;
create policy "Approved read buffer_layers" on public.buffer_layers
  for select using (public.has_map_access());

drop policy if exists "Public read teams" on public.teams;
drop policy if exists "Approved read teams" on public.teams;
create policy "Approved read teams" on public.teams
  for select using (public.has_map_access());

-- 6. Storage: make kmz-files private ──────────────────────────────────────────
-- A public bucket serves files by URL with no auth check at all, so policies
-- alone are not enough — the bucket flag must be off.
update storage.buckets set public = false where id = 'kmz-files';

drop policy if exists "kmz-files approved read" on storage.objects;
create policy "kmz-files approved read" on storage.objects
  for select using (bucket_id = 'kmz-files' and public.has_map_access());

drop policy if exists "kmz-files admin insert" on storage.objects;
create policy "kmz-files admin insert" on storage.objects
  for insert with check (bucket_id = 'kmz-files' and public.is_admin());

drop policy if exists "kmz-files admin update" on storage.objects;
create policy "kmz-files admin update" on storage.objects
  for update using (bucket_id = 'kmz-files' and public.is_admin());

drop policy if exists "kmz-files admin delete" on storage.objects;
create policy "kmz-files admin delete" on storage.objects
  for delete using (bucket_id = 'kmz-files' and public.is_admin());

-- ⚠ Policies are OR-ed together. Any older storage policy created in the
-- dashboard (e.g. "authenticated users can upload") still grants access.
-- Review and delete those by hand:
--   select policyname, cmd, qual, with_check
--   from pg_policies where schemaname = 'storage' and tablename = 'objects';

-- 7. Review who already has access ────────────────────────────────────────────
-- Every account created before this migration was auto-approved as 'user'.
-- List them, then demote anyone who should not see customer data:
--   select email, full_name, role, role_request, created_at
--   from public.profiles order by created_at;
--   update public.profiles set role = 'pending' where email = '...';
