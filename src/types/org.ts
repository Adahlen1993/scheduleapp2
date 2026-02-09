export type OrgRole = "owner" | "manager" | "employee";
export type OrgMemberType = "active" | "invited";

export type OrgMemberRow = {
  member_type: OrgMemberType;
  user_id: string | null;
  email: string | null;        // note: can be null if profiles missing (rare now)
  first_name: string | null;
  last_name: string | null;
  role: OrgRole;
  joined_at: string | null;
  invited_at: string | null;
};
