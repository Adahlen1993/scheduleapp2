-- Step 2 (revised): organizations

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  timezone text not null default 'America/Chicago',

  street_address text,
  city text,
  state text,
  zipcode text,
  country text,

  created_by uuid not null references auth.users(id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_organizations on public.organizations;
create trigger set_updated_at_organizations
before update on public.organizations
for each row execute function public.tg_set_updated_at();

alter table public.organizations enable row level security;

-- temporary: creator-only access until org_memberships exists
drop policy if exists org_select_creator on public.organizations;
create policy org_select_creator
on public.organizations for select
using (created_by = auth.uid());

drop policy if exists org_insert_creator on public.organizations;
create policy org_insert_creator
on public.organizations for insert
with check (created_by = auth.uid());

drop policy if exists org_update_creator on public.organizations;
create policy org_update_creator
on public.organizations for update
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists org_delete_creator on public.organizations;
create policy org_delete_creator
on public.organizations for delete
using (created_by = auth.uid());

-- Step 3.1: Update organizations RLS to use org_memberships

alter table public.organizations enable row level security;

-- Remove old creator-only policies (if they exist)
drop policy if exists organizations_select_creator on public.organizations;
drop policy if exists organizations_update_creator on public.organizations;
drop policy if exists organizations_delete_creator on public.organizations;
drop policy if exists organizations_insert_creator on public.organizations;

-- Members can read their org; platform admin can read all
create policy organizations_select_member
on public.organizations for select
using (public.is_platform_admin() or public.is_org_member(id));

-- Anyone authenticated can create an org (platform admin also OK)
-- created_by must be current user
create policy organizations_insert_auth
on public.organizations for insert
with check (auth.uid() = created_by);

-- Owners can update/delete org; platform admin can too
create policy organizations_update_owner
on public.organizations for update
using (public.is_platform_admin() or public.has_org_role(id, array['owner']::public.org_role[]));

create policy organizations_delete_owner
on public.organizations for delete
using (public.is_platform_admin() or public.has_org_role(id, array['owner']::public.org_role[]));
