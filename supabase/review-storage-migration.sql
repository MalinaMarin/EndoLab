-- Run once in Supabase SQL Editor if "Save corrections" reports that
-- review audit storage is unavailable.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid references public.cases(id),
  report_text text,
  corrected jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  reviewer text,
  reviewed_at timestamptz,
  claimed_by text,
  claimed_at timestamptz,
  locked_until timestamptz,
  organization_id uuid references public.organizations(id)
);

alter table public.reviews add column if not exists case_id uuid references public.cases(id);
alter table public.reviews add column if not exists report_text text;
alter table public.reviews add column if not exists corrected jsonb not null default '{}'::jsonb;
alter table public.reviews add column if not exists status text not null default 'pending';
alter table public.reviews add column if not exists reviewer text;
alter table public.reviews add column if not exists reviewed_at timestamptz;
alter table public.reviews add column if not exists claimed_by text;
alter table public.reviews add column if not exists claimed_at timestamptz;
alter table public.reviews add column if not exists locked_until timestamptz;
alter table public.reviews add column if not exists organization_id uuid references public.organizations(id);

create index if not exists reviews_status_idx on public.reviews(status);
create index if not exists reviews_case_id_idx on public.reviews(case_id);

alter table public.reviews enable row level security;
grant select, insert, update, delete on table public.reviews to authenticated;
grant all privileges on table public.reviews to service_role;
