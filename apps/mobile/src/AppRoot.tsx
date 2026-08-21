import * as Sentry from '@sentry/react-native';
import { useEffect, useState } from 'react';

import type { Me } from './api/client';
import { ApiError, provisionMe, reactivateMe } from './api/client';
import { supabase } from './auth/supabase';
import { useSession } from './auth/useSession';
import { DeactivatedScreen } from './screens/DeactivatedScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SignInScreen } from './screens/SignInScreen';

// The auth gate: 登入 until a session exists, the app once it does. Signing
// in (or restoring a session) provisions the User's world through the
// idempotent /me call, whose categories feed the entry form.
export function AppRoot() {
  const session = useSession();
  const accessToken = session?.access_token;
  const userId = session?.user.id;
  const [world, setWorld] = useState<{ userId: string; me: Me } | null>(null);
  // Bumped when the form creates a category, so /me is refetched.
  const [worldVersion, setWorldVersion] = useState(0);
  // A deactivated account (#15): /me answers 403 and only the deliberate
  // restore (or 登出) leaves this state.
  const [deactivated, setDeactivated] = useState(false);

  useEffect(() => {
    if (!accessToken || !userId) return;
    let active = true;
    provisionMe(accessToken)
      .then((me) => {
        if (!active) return;
        setWorld({ userId, me });
        setDeactivated(false);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 403) {
          if (active) setDeactivated(true);
          return;
        }
        Sentry.captureException(error);
      });
    return () => {
      active = false;
    };
  }, [accessToken, userId, worldVersion]);

  // Staleness is keyed by user, not token: a routine token refresh keeps the
  // provisioned world, while signing in as a different user discards it.
  const me = world !== null && world.userId === userId ? world.me : null;

  if (session === undefined) {
    return null;
  }
  if (!session) {
    return <SignInScreen />;
  }
  if (deactivated && userId) {
    return (
      <DeactivatedScreen
        onRestore={async () => {
          const me = await reactivateMe(session.access_token);
          setWorld({ userId, me });
          setDeactivated(false);
        }}
        onSignOut={() => {
          void supabase.auth.signOut();
        }}
      />
    );
  }
  return (
    <HomeScreen
      accessToken={session.access_token}
      categories={me?.categories ?? []}
      onCategoriesChanged={() => setWorldVersion((v) => v + 1)}
    />
  );
}
