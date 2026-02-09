-- helper function
create or replace function is_org_member(
  p_org_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from org_memberships om
    where om.org_id = p_org_id
      and om.user_id = p_user_id
  );
$$;

-- main RPC query
create or replace function get_org_members(
  p_org_id uuid
)
returns table (
  member_type text,
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  permission_flags jsonb,
  joined_at timestamptz,
  invited_at timestamptz
)
language plpgsql
security definer
as $$
begin
  -- Guard: must be authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Guard: must belong to org
  if not is_org_member(p_org_id, auth.uid()) then
    raise exception 'Not authorized for this organization';
  end if;

  return query

  -- Active members
  select
    'active' as member_type,
    p.id as user_id,
    p.email,
    p.first_name,
    p.last_name,
    om.role,
    om.permission_flags,
    om.created_at as joined_at,
    null::timestamptz as invited_at
  from org_memberships om
  join profiles p on p.id = om.user_id
  where om.org_id = p_org_id

  union all

  -- Pending invites
  select
    'invited' as member_type,
    null as user_id,
    oi.email,
    null as first_name,
    null as last_name,
    oi.role,
    null as permission_flags,
    null as joined_at,
    oi.created_at as invited_at
  from org_invites oi
  where oi.org_id = p_org_id
    and oi.redeemed_at is null

  order by
    member_type desc,  -- active first
    joined_at nulls last,
    invited_at nulls last;

end;
$$;
