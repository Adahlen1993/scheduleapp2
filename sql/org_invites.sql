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
