import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type Organization = {
  id: string;
  name: string;
  timezone: string;
};

type OrgState = {
  activeOrgId: string | null;
  orgs: Organization[];
  loading: boolean;

  fetchOrgs: () => Promise<void>;
  setActiveOrgId: (id: string | null) => void;
  createOrg: (name: string) => Promise<string | null>;
};

export const useOrgStore = create<OrgState>((set, get) => ({
  activeOrgId: null,
  orgs: [],
  loading: false,

  setActiveOrgId: (id) => set({ activeOrgId: id }),

  fetchOrgs: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('organizations')
      .select('id,name,timezone')
      .order('created_at', { ascending: false });

    if (error) {
      set({ loading: false });
      throw error;
    }

    set({ orgs: data ?? [], loading: false });

    // Auto-pick an org if none selected
    const { activeOrgId } = get();
    if (!activeOrgId && data && data.length > 0) {
      set({ activeOrgId: data[0].id });
    }
  },

  createOrg: async (name: string) => {
    set({ loading: true });
    const { data, error } = await supabase.rpc('create_organization_with_owner', {
      p_name: name,
    });
    set({ loading: false });

    if (error) throw error;

    // data is org_id (uuid)
    const orgId = data as unknown as string;
    await get().fetchOrgs();
    set({ activeOrgId: orgId });
    return orgId;
  },
}));
