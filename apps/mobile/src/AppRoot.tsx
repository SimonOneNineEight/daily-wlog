import * as Sentry from '@sentry/react-native';
import { useEffect } from 'react';

import { provisionMe } from './api/client';
import { useSession } from './auth/useSession';
import { HomeScreen } from './screens/HomeScreen';
import { SignInScreen } from './screens/SignInScreen';

// The auth gate: 登入 until a session exists, the app once it does. Signing
// in (or restoring a session) provisions the User's world through the
// idempotent /me call.
export function AppRoot() {
  const session = useSession();
  const accessToken = session?.access_token;

  useEffect(() => {
    if (!accessToken) return;
    provisionMe(accessToken).catch((error) => {
      Sentry.captureException(error);
    });
  }, [accessToken]);

  if (session === undefined) {
    return null;
  }
  return session ? <HomeScreen /> : <SignInScreen />;
}
