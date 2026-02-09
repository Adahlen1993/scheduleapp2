-- Step 6: org_invites (invite employees/managers by email)

do $$ begin
  create type public.invite_status as enum ('pending','accepted','revoked','expired');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),

  org_id uuid not null references public.organizations(id) on delete cascade,

  email text not null,
  role public.org_role not null, -- owner/manager/employee (usually manager/employee)

  status public.invite_status not null default 'pending',
  token text not null unique, -- public invite token (random)

  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,

  expires_at timestamptz not null default (now() + interval '14 days'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_org_invites on public.org_invites;
create trigger set_updated_at_org_invites
before update on public.org_invites
for each row execute function public.tg_set_updated_at();

alter table public.org_invites enable row level security;

create index if not exists idx_org_invites_org on public.org_invites(org_id);
create index if not exists idx_org_invites_email on public.org_invites(email);
create index if not exists idx_org_invites_status on public.org_invites(status);

-- RLS policies:
-- Select: only those who can manage members (and platform admin) can see invites
drop policy if exists org_invites_select_manage_members on public.org_invites;
create policy org_invites_select_manage_members
on public.org_invites for select
using (public.is_platform_admin() or public.can_manage_members(org_id));

-- Insert: only those who can manage members
drop policy if exists org_invites_insert_manage_members on public.org_invites;
create policy org_invites_insert_manage_members
on public.org_invites for insert
with check (
  (public.is_platform_admin() or public.can_manage_members(org_id))
  and invited_by = auth.uid()
);

-- Update: only those who can manage members (used for revoke etc.)
drop policy if exists org_invites_update_manage_members on public.org_invites;
create policy org_invites_update_manage_members
on public.org_invites for update
using (public.is_platform_admin() or public.can_manage_members(org_id))
with check (public.is_platform_admin() or public.can_manage_members(org_id));

-- RPC token; CREATE INVITE
create or replace function public.create_org_invite(
  p_org_id uuid,
  p_email text,
  p_role public.org_role
)
returns text
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- only allowed for owners / managers with can_manage_members (or platform admin)
  if not (public.is_platform_admin() or public.can_manage_members(p_org_id)) then
    raise exception 'Not allowed';
  end if;

  -- normalize
  p_email := lower(trim(p_email));

  if p_email = '' then
    raise exception 'Email required';
  end if;

  -- generate token (simple + strong enough for MVP)
  v_token := encode(gen_random_bytes(24), 'hex');

  -- expire any old pending invites for same org/email (optional but keeps it clean)
  update public.org_invites
    set status = 'expired'
  where org_id = p_org_id
    and lower(email) = p_email
    and status = 'pending';

  insert into public.org_invites (org_id, email, role, status, token, invited_by)
  values (p_org_id, p_email, p_role, 'pending', v_token, auth.uid());

  return v_token;
end;
$$;

revoke all on function public.create_org_invite(uuid,text,public.org_role) from public;
grant execute on function public.create_org_invite(uuid,text,public.org_role) to authenticated;

-- RPC token; ACCEPT INVITE
create or replace function public.redeem_org_invite(
  p_token text
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_inv public.org_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_inv
  from public.org_invites
  where token = p_token;

  if not found then
    raise exception 'Invalid invite token';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'Invite is not pending';
  end if;

  if v_inv.expires_at < now() then
    update public.org_invites set status = 'expired' where id = v_inv.id;
    raise exception 'Invite expired';
  end if;

  -- Ensure the logged-in user matches the invited email
  if lower(coalesce((select email from auth.users where id = auth.uid()), '')) <> lower(v_inv.email) then
    raise exception 'This invite was sent to a different email';
  end if;

  -- Create membership (idempotent)
  insert into public.org_memberships (org_id, user_id, role, active)
  values (v_inv.org_id, auth.uid(), v_inv.role, true)
  on conflict (org_id, user_id) do update
    set role = excluded.role,
        active = true,
        updated_at = now();

  -- Mark invite accepted
  update public.org_invites
    set status = 'accepted',
        accepted_by = auth.uid(),
        accepted_at = now()
  where id = v_inv.id;

  return v_inv.org_id;
end;
$$;

revoke all on function public.redeem_org_invite(text) from public;
grant execute on function public.redeem_org_invite(text) to authenticated;
