import { supabase } from "../lib/supabase";
import type { OrgMemberRow } from "../types/org";

export async function fetchOrgMembers(orgId: string): Promise<OrgMemberRow[]> {
  const { data, error } = await supabase.rpc("get_org_members", {
    p_org_id: orgId,
  });

  if (error) throw error;
  return (data ?? []) as OrgMemberRow[];
}
