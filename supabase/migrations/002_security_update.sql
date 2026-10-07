-- ─── SECURITY REFINEMENT (Phase 1) ───────────────────────────────────────────
-- This migration secures the database by ensuring all tables are protected by
-- strict RLS policies, restricting mutations to authenticated admins.

-- 1. Create Profile and User Management if not exists
-- Users are automatically created in auth.users; we mirror them in public.profiles.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('admin', 'user')) default 'user',
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- 2. Create remaining functional tables if not exists
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  contract_ref text,
  name text,
  phone text,
  phone2 text,
  area text,
  par_status text,
  lead_generate text,
  lead_generate_name text,
  latitude float8,
  longitude float8,
  created_at timestamptz default now()
);

create table if not exists public.buffer_layers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  visible boolean default true,
  locked boolean default false,
  file_path text,
  geojson jsonb,
  created_at timestamptz default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  layer_ids uuid[] default '{}',
  created_at timestamptz default now()
);

-- 3. Enable RLS on all tables
alter table public.customers enable row level security;
alter table public.buffer_layers enable row level security;
alter table public.teams enable row level security;

-- 4. Admin Role Helper
create or replace function public.is_admin()
returns boolean as $$
begin
  return (
    select (role = 'admin')
    from public.profiles
    where id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 5. Strict Policies ──────────────────────────────────────────────────────────

-- Profiles: Users can read their own, admins can read all. 
-- Role changes are admin-only via DB direct/API.
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id or is_admin());

-- Customers: Public read, Admin write
create policy "Public read customers" on public.customers
  for select using (true);

create policy "Admins write customers" on public.customers
  for all using (is_admin());

-- KMZ Layers (Updating policies from 001)
drop policy if exists "Admin insert" on public.kmz_layers;
drop policy if exists "Admin update" on public.kmz_layers;
drop policy if exists "Admin delete" on public.kmz_layers;

create policy "Admins write kmz_layers" on public.kmz_layers
  for all using (is_admin());

-- Buffer Layers: Public read, Admin write
create policy "Public read buffer_layers" on public.buffer_layers
  for select using (true);

create policy "Admins write buffer_layers" on public.buffer_layers
  for all using (is_admin());

-- Teams: Public read, Admin write
create policy "Public read teams" on public.teams
  for select using (true);

create policy "Admins write teams" on public.teams
  for all using (is_admin());

-- 6. Auth Trigger for automated profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'user');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
