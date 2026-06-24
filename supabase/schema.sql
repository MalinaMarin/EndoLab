create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  full_name text not null default '',
  account_type text not null check (account_type in ('patient', 'clinic'))
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  created_by uuid not null references auth.users(id),
  status text not null default 'active'
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'doctor', 'coordinator')),
  status text not null default 'active' check (status in ('active', 'suspended'))
);

create unique index if not exists organization_memberships_org_user_idx
on public.organization_memberships(organization_id, user_id);
create index if not exists organization_memberships_user_idx
on public.organization_memberships(user_id);
create unique index if not exists organization_memberships_one_active_org_idx
on public.organization_memberships(user_id)
where status = 'active';

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('doctor', 'coordinator')),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

create unique index if not exists organization_pending_invitation_idx
on public.organization_invitations(organization_id, lower(email))
where status = 'pending';

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'submitted',
  title text not null,
  age int,
  country text,
  summary text not null,
  timeline jsonb not null default '[]'::jsonb,
  disease_map jsonb not null default '{}'::jsonb,
  surgeries jsonb not null default '[]'::jsonb,
  imaging jsonb not null default '[]'::jsonb,
  symptoms jsonb not null default '[]'::jsonb,
  uncertainty_flags jsonb not null default '[]'::jsonb,
  missing_info jsonb not null default '[]'::jsonb,
  severity text not null default 'LOW',
  complexity_note text not null default '',
  consent_version text,
  consent_at timestamptz,
  payment_status text not null default 'unpaid',
  stripe_session_id text,
  paid_at timestamptz,
  owner_user_id uuid references auth.users(id),
  organization_id uuid references public.organizations(id)
);

create index if not exists cases_created_at_idx on public.cases(created_at desc);
create index if not exists cases_owner_user_id_idx on public.cases(owner_user_id);
create index if not exists cases_organization_id_idx on public.cases(organization_id);

insert into storage.buckets (id, name, public)
values ('case-files', 'case-files', false)
on conflict (id) do update set public = false;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid not null references public.cases(id),
  specialist_id text not null,
  status text not null default 'pending',
  notes text,
  requested_by text,
  requested_by_user_id uuid references auth.users(id),
  organization_id uuid references public.organizations(id)
);

create index if not exists referrals_case_id_idx on public.referrals(case_id);
create index if not exists referrals_specialist_id_idx on public.referrals(specialist_id);
create unique index if not exists referrals_active_case_specialist_idx
on public.referrals(case_id, specialist_id)
where status in ('pending', 'accepted');

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid references public.cases(id),
  report_text text,
  corrected jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  reviewer text,
  reviewed_at timestamptz
  ,claimed_by text,
  claimed_at timestamptz,
  locked_until timestamptz,
  organization_id uuid references public.organizations(id)
);

create index if not exists reviews_status_idx on public.reviews(status);
create index if not exists reviews_case_id_idx on public.reviews(case_id);
create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null,
  public_url text,
  record_count int not null default 0,
  status text not null default 'success',
  error text
);

create index if not exists export_jobs_created_at_idx on public.export_jobs(created_at desc);
create index if not exists export_jobs_status_idx on public.export_jobs(status);

create table if not exists public.import_audits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  created_by text,
  summary jsonb not null default '{}'::jsonb,
  per_row jsonb not null default '[]'::jsonb,
  original_headers jsonb not null default '[]'::jsonb,
  organization_id uuid references public.organizations(id)
);

create index if not exists import_audits_created_at_idx on public.import_audits(created_at desc);

create table if not exists public.import_draft_rows (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.import_audits(id) on delete cascade,
  row_index int not null,
  draft_payload jsonb not null default '{}'::jsonb,
  decision text,
  created_at timestamptz not null default now()
);

create unique index if not exists import_draft_rows_audit_row_idx on public.import_draft_rows(audit_id, row_index);
create index if not exists import_draft_rows_audit_id_idx on public.import_draft_rows(audit_id);

-- Governance and analytics tables
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  user_id text,
  case_id uuid references public.cases(id),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_event_type_idx on public.analytics_events(event_type);
create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id text not null,
  consent_given boolean not null default false,
  consent_at timestamptz,
  consent_version text,
  details jsonb not null default '{}'::jsonb
);

create unique index if not exists user_consents_user_id_idx on public.user_consents(user_id);

-- Track whether an export job was de-identified
alter table public.export_jobs add column if not exists deidentified boolean not null default false;

-- Admin sessions for reviewer tokens
create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  jti text unique,
  email text not null,
  scopes text not null,
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_sessions_jti_idx on public.admin_sessions(jti);
create index if not exists admin_sessions_email_idx on public.admin_sessions(email);

-- Admin users allowlist (emails)
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  created_at timestamptz not null default now(),
  role text not null default 'reviewer'
);

create index if not exists admin_users_email_idx on public.admin_users(email);

alter table public.cases add column if not exists consent_version text;
alter table public.cases add column if not exists consent_at timestamptz;
alter table public.cases add column if not exists payment_status text not null default 'unpaid';
alter table public.cases add column if not exists stripe_session_id text;
alter table public.cases add column if not exists paid_at timestamptz;
alter table public.cases add column if not exists owner_user_id uuid references auth.users(id);
alter table public.cases add column if not exists organization_id uuid references public.organizations(id);
alter table public.cases add column if not exists assigned_to text;
alter table public.referrals add column if not exists requested_by_user_id uuid references auth.users(id);
alter table public.referrals add column if not exists organization_id uuid references public.organizations(id);
alter table public.reviews add column if not exists organization_id uuid references public.organizations(id);
alter table public.import_audits add column if not exists organization_id uuid references public.organizations(id);

update public.cases set payment_status = 'not_required' where status = 'imported' and payment_status = 'unpaid';

alter table public.cases enable row level security;
alter table public.referrals enable row level security;
alter table public.reviews enable row level security;
alter table public.export_jobs enable row level security;
alter table public.import_audits enable row level security;
alter table public.import_draft_rows enable row level security;
alter table public.analytics_events enable row level security;
alter table public.user_consents enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_invitations enable row level security;

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = target_org
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_org_owner(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = target_org
      and user_id = auth.uid()
      and role = 'owner'
      and status = 'active'
  );
$$;

drop policy if exists "profiles_read_self" on public.profiles;
create policy "profiles_read_self" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "organizations_read_members" on public.organizations;
create policy "organizations_read_members" on public.organizations for select using (public.is_org_member(id));
drop policy if exists "organizations_update_owners" on public.organizations;
create policy "organizations_update_owners" on public.organizations for update using (public.is_org_owner(id));

drop policy if exists "memberships_read_organization" on public.organization_memberships;
create policy "memberships_read_organization" on public.organization_memberships
for select using (user_id = auth.uid() or public.is_org_member(organization_id));

drop policy if exists "invitations_read_owners" on public.organization_invitations;
create policy "invitations_read_owners" on public.organization_invitations
for select using (public.is_org_owner(organization_id));
drop policy if exists "invitations_manage_owners" on public.organization_invitations;
create policy "invitations_manage_owners" on public.organization_invitations
for all using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));

drop policy if exists "cases_read_owner_or_org" on public.cases;
create policy "cases_read_owner_or_org" on public.cases
for select using (owner_user_id = auth.uid() or public.is_org_member(organization_id));
drop policy if exists "cases_insert_owner_or_org" on public.cases;
create policy "cases_insert_owner_or_org" on public.cases
for insert with check (owner_user_id = auth.uid() or public.is_org_member(organization_id));
drop policy if exists "cases_update_owner_or_org" on public.cases;
create policy "cases_update_owner_or_org" on public.cases
for update using (owner_user_id = auth.uid() or public.is_org_member(organization_id))
with check (owner_user_id = auth.uid() or public.is_org_member(organization_id));

drop policy if exists "referrals_access_by_case" on public.referrals;
create policy "referrals_access_by_case" on public.referrals
for all using (
  exists (
    select 1 from public.cases c
    where c.id = referrals.case_id
      and (c.owner_user_id = auth.uid() or public.is_org_member(c.organization_id))
  )
) with check (
  exists (
    select 1 from public.cases c
    where c.id = referrals.case_id
      and (c.owner_user_id = auth.uid() or public.is_org_member(c.organization_id))
  )
);

drop policy if exists "reviews_access_by_case" on public.reviews;
create policy "reviews_access_by_case" on public.reviews
for select using (
  exists (
    select 1 from public.cases c
    where c.id = reviews.case_id
      and (c.owner_user_id = auth.uid() or public.is_org_member(c.organization_id))
  )
);

drop policy if exists "case_files_authenticated_read" on storage.objects;
create policy "case_files_authenticated_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'case-files'
  and exists (
    select 1 from public.cases c
    where c.id::text = (storage.foldername(name))[1]
      and (c.owner_user_id = auth.uid() or public.is_org_member(c.organization_id))
  )
);

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table
  public.profiles,
  public.organizations,
  public.organization_memberships,
  public.organization_invitations,
  public.cases,
  public.referrals,
  public.reviews,
  public.import_audits,
  public.import_draft_rows,
  public.analytics_events,
  public.user_consents
to authenticated;

grant all privileges on table
  public.profiles,
  public.organizations,
  public.organization_memberships,
  public.organization_invitations,
  public.cases,
  public.referrals,
  public.reviews,
  public.export_jobs,
  public.import_audits,
  public.import_draft_rows,
  public.analytics_events,
  public.user_consents,
  public.admin_sessions,
  public.admin_users
to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
grant all privileges on tables to service_role;

alter default privileges in schema public
grant usage, select on sequences to authenticated, service_role;
