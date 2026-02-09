-- Step 5: work_site_memberships (assign users to specific worksites)

do $$ begin
  create type public.work_site_role as enum ('manager','employee');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.work_site_memberships (
  work_site_id uuid not null references public.work_sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  role public.work_site_role not null,
  active boolean not null default true,

  created_by uuid not null references auth.users(id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (work_site_id, user_id)
);

drop trigger if exists set_updated_at_work_site_memberships on public.work_site_memberships;
create trigger set_updated_at_work_site_memberships
before update on public.work_site_memberships
for each row execute function public.tg_set_updated_at();

alter table public.work_site_memberships enable row level security;

create index if not exists idx_wsm_user on public.work_site_memberships(user_id);
create index if not exists idx_wsm_site on public.work_site_memberships(work_site_id);

-- helper functions
create or replace function public.is_work_site_member(p_work_site_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.work_site_memberships wsm
    where wsm.work_site_id = p_work_site_id
      and wsm.user_id = auth.uid()
      and wsm.active = true
  );
$$;

create or replace function public.is_work_site_manager(p_work_site_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_platform_admin()
  or exists (
    select 1
    from public.work_site_memberships wsm
    where wsm.work_site_id = p_work_site_id
      and wsm.user_id = auth.uid()
      and wsm.active = true
      and wsm.role = 'manager'
  );
$$;

create or replace function public.work_site_org_id(p_work_site_id uuid)
returns uuid
language sql
stable
as $$
  select ws.org_id
  from public.work_sites ws
  where ws.id = p_work_site_id;
$$;

-- RLS policies:
-- Select: org members can read site memberships (platform admin too)
drop policy if exists wsm_select_org_member on public.work_site_memberships;
create policy wsm_select_org_member
on public.work_site_memberships for select
using (
  public.is_platform_admin()
  or public.is_org_member(public.work_site_org_id(work_site_id))
);

-- Insert/update/delete: only org owners or managers with can_manage_members
drop policy if exists wsm_insert_manage_members on public.work_site_memberships;
create policy wsm_insert_manage_members
on public.work_site_memberships for insert
with check (
  (public.is_platform_admin() or public.can_manage_members(public.work_site_org_id(work_site_id)))
  and created_by = auth.uid()
);

drop policy if exists wsm_update_manage_members on public.work_site_memberships;
create policy wsm_update_manage_members
on public.work_site_memberships for update
using (
  public.is_platform_admin() or public.can_manage_members(public.work_site_org_id(work_site_id))
)
with check (
  public.is_platform_admin() or public.can_manage_members(public.work_site_org_id(work_site_id))
);

drop policy if exists wsm_delete_manage_members on public.work_site_memberships;
create policy wsm_delete_manage_members
on public.work_site_memberships for delete
using (
  public.is_platform_admin() or public.can_manage_members(public.work_site_org_id(work_site_id))
);

