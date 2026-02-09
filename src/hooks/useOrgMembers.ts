import { useQuery } from "@tanstack/react-query";
import { fetchOrgMembers } from "../api/orgMembers";

export function useOrgMembers(orgId: string | null) {
  return useQuery({
    queryKey: ["orgMembers", orgId],
    queryFn: () => fetchOrgMembers(orgId!),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
