-- Run once in Supabase SQL Editor for an existing EndoLab database.
-- The current cases RLS policy already limits updates to the patient owner
-- or an active member of the case organization.

alter table public.cases
  add column if not exists assigned_to text;

grant select, update on table public.cases to authenticated;
grant all privileges on table public.cases to service_role;
