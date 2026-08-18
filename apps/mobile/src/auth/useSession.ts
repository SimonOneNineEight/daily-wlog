import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from './supabase';

/**
 * The current Supabase session: undefined while restoring from storage on
 * launch, null when signed out, a Session when signed in. Persistence across
 * restarts comes from the client's AsyncStorage-backed session store.
 */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return session;
}
