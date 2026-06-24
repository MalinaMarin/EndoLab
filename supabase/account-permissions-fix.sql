grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on table
  public.profiles,
  public.organizations,
  public.organization_memberships,
  public.organization_invitations
to authenticated;

grant all privileges on table
  public.profiles,
  public.organizations,
  public.organization_memberships,
  public.organization_invitations
to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
grant all privileges on tables to service_role;

alter default privileges in schema public
grant usage, select on sequences to authenticated, service_role;
