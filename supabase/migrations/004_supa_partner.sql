-- "Lead Generator" is now "Supa Partner". Rename the columns and add the
-- partner's GPS so the map can show customer ↔ partner distance.
alter table public.customers rename column lead_generate to supa_partner_code;
alter table public.customers rename column lead_generate_name to supa_partner_name;
alter table public.customers add column if not exists supa_partner_latitude float8;
alter table public.customers add column if not exists supa_partner_longitude float8;
