-- Step 3: org roles + memberships

-- 1) roles enum
do $$ begin
  create type public.org_role as enum ('owner','manager','employee');
exception
  when duplicate_object then null;
end $$;

-- 2) org_memberships
create table if not exists public.org_memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  role public.org_role not null,
  active boolean not null default true,

  -- manager permissions (owner can toggle these)
  can_manage_sites boolean not null default false,   -- can create/edit/delete worksites
  can_manage_members boolean not null default false, -- can invite/remove users in org

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (org_id, user_id)
);

drop trigger if exists set_updated_at_org_memberships on public.org_memberships;
create trigger set_updated_at_org_memberships
before update on public.org_memberships
for each row execute function public.tg_set_updated_at();

alter table public.org_memberships enable row level security;

create index if not exists idx_org_memberships_user on public.org_memberships(user_id);
create index if not exists idx_org_memberships_org on public.org_memberships(org_id);

-- 3) Admin helper (reads JWT claim: app_metadata.app_admin = true)
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'app_admin')::boolean, false);
$$;

-- 4) RLS helper functions
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.active = true
  );
$$;

create or replace function public.has_org_role(p_org_id uuid, p_roles public.org_role[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.active = true
      and m.role = any(p_roles)
  );
$$;

create or replace function public.can_manage_sites(p_org_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.org_memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.active = true
      and (
        m.role = 'owner'
        or (m.role = 'manager' and m.can_manage_sites = true)
      )
  );
$$;

create or replace function public.can_manage_members(p_org_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.org_memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.active = true
      and (
        m.role = 'owner'
        or (m.role = 'manager' and m.can_manage_members = true)
      )
  );
$$;

-- 5) Policies
-- Platform admins can do anything (via helper functions below)
drop policy if exists org_memberships_select_member on public.org_memberships;
create policy org_memberships_select_member
on public.org_memberships for select
using (public.is_platform_admin() or public.is_org_member(org_id));

-- Only owners/managers-with-permission can manage memberships
drop policy if exists org_memberships_insert_manage_members on public.org_memberships;
create policy org_memberships_insert_manage_members
on public.org_memberships for insert
with check (public.can_manage_members(org_id));

drop policy if exists org_memberships_update_manage_members on public.org_memberships;
create policy org_memberships_update_manage_members
on public.org_memberships for update
using (public.can_manage_members(org_id))
with check (public.can_manage_members(org_id));

drop policy if exists org_memberships_delete_manage_members on public.org_memberships;
create policy org_memberships_delete_manage_members
on public.org_memberships for delete
using (public.can_manage_members(org_id));

-- Step 3.2: RPC to create org and auto-add creator as owner

create or replace function public.create_organization_with_owner(
  p_name text,
  p_timezone text default 'America/Chicago',
  p_street_address text default null,
  p_city text default null,
  p_state text default null,
  p_zipcode text default null,
  p_country text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (
    name, timezone, street_address, city, state, zipcode, country, created_by
  )
  values (
    p_name, p_timezone, p_street_address, p_city, p_state, p_zipcode, p_country, auth.uid()
  )
  returning id into v_org_id;

  insert into public.org_memberships (org_id, user_id, role, active, can_manage_sites, can_manage_members)
  values (v_org_id, auth.uid(), 'owner', true, true, true)
  on conflict (org_id, user_id) do nothing;

  return v_org_id;
end;
$$;

-- Allow authenticated users to call it
revoke all on function public.create_organization_with_owner(text,text,text,text,text,text,text) from public;
grant execute on function public.create_organization_with_owner(text,text,text,text,text,text,text) to authenticated;
