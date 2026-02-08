import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

type SessionState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  init: () => Promise<void>;
  signOut: () => Promise<void>;
};

let subscribed = false;

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  init: async () => {
    // Prevent multiple subscriptions (Expo Fast Refresh can re-run init)
    
    if (!subscribed) {
      subscribed = true;

      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session: session ?? null,
          user: session?.user ?? null,
          loading: false,
        });
      });
    }

    // Load initial session
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      set({ session: null, user: null, loading: false });
      return;
    }

    set({
      session: data.session ?? null,
      user: data.session?.user ?? null,
      loading: false,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    // listener will update store
  },
}));
