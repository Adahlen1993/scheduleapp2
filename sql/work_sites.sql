-- Step 4: work_sites (businesses / scheduling contexts inside an org)

create table if not exists public.work_sites (
  id uuid primary key default gen_random_uuid(),

  org_id uuid not null references public.organizations(id) on delete cascade,

  name text not null,        -- e.g. "Marge's Diner"
  nickname text,             -- e.g. "Diner" or "Subway North"
  timezone text,             -- optional override; if null use organizations.timezone

  street_address text,
  city text,
  state text,
  zipcode text,
  country text,

  active boolean not null default true,

  created_by uuid not null references auth.users(id) on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_work_sites on public.work_sites;
create trigger set_updated_at_work_sites
before update on public.work_sites
for each row execute function public.tg_set_updated_at();

alter table public.work_sites enable row level security;

create index if not exists idx_work_sites_org on public.work_sites(org_id);
create index if not exists idx_work_sites_active on public.work_sites(org_id, active);

-- Members can read sites in their org (platform admin too)
drop policy if exists work_sites_select_member on public.work_sites;
create policy work_sites_select_member
on public.work_sites for select
using (public.is_platform_admin() or public.is_org_member(org_id));

-- Only owners or managers w/ can_manage_sites can create/update/delete sites
drop policy if exists work_sites_insert_manage_sites on public.work_sites;
create policy work_sites_insert_manage_sites
on public.work_sites for insert
with check (
  (public.is_platform_admin() or public.can_manage_sites(org_id))
  and created_by = auth.uid()
);

drop policy if exists work_sites_update_manage_sites on public.work_sites;
create policy work_sites_update_manage_sites
on public.work_sites for update
using (public.is_platform_admin() or public.can_manage_sites(org_id))
with check (public.is_platform_admin() or public.can_manage_sites(org_id));

drop policy if exists work_sites_delete_manage_sites on public.work_sites;
create policy work_sites_delete_manage_sites
on public.work_sites for delete
using (public.is_platform_admin() or public.can_manage_sites(org_id));
