import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { supabase } from '../auth/supabase';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

// 登入 per the design brief (§ Screens 7): wordmark, one line of promise,
// provider buttons on calm neutral ground, nothing else. The Apple button is
// the platform's official component and only renders where the entitlement
// exists; the Google button falls back to a themed label until the official
// GoogleSigninButton is wired in the dev-build pass (needs OAuth client ids).
export function SignInScreen() {
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    AppleAuthentication.isAvailableAsync().then((available) => {
      if (active) setAppleAvailable(available);
    });
    return () => {
      active = false;
    };
  }, []);

  const signInWithApple = async () => {
    setFailed(false);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple returned no identity token');
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
    } catch (error) {
      // A cancelled sheet is a decision, not a failure.
      if ((error as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        setFailed(true);
      }
    }
  };

  const signInWithGoogle = async () => {
    setFailed(false);
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken;
      if (!idToken) {
        throw new Error('Google returned no id token');
      }
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
      if (error) throw error;
    } catch {
      setFailed(true);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.brand}>
        <Text style={styles.wordmark}>{strings.signIn.wordmark}</Text>
        <Text style={styles.promise}>{strings.signIn.promise}</Text>
      </View>
      <View style={styles.providers}>
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={theme.radius.r4}
            style={styles.appleButton}
            onPress={signInWithApple}
          />
        ) : null}
        <Pressable accessibilityRole="button" style={styles.googleButton} onPress={signInWithGoogle}>
          <Text style={styles.googleLabel}>{strings.signIn.google}</Text>
        </Pressable>
        {failed ? <Text style={styles.error}>{strings.signIn.error}</Text> : null}
      </View>
    </View>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
    paddingHorizontal: t.spacing.screenGutter,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.space4,
  },
  wordmark: {
    ...t.typography.navTitle,
    color: t.colors.textPrimary,
  },
  promise: {
    ...t.typography.note,
    color: t.colors.textSecondary,
  },
  providers: {
    gap: t.spacing.space5,
    paddingBottom: t.spacing.space10,
  },
  appleButton: {
    height: t.spacing.rowHeight,
  },
  googleButton: {
    height: t.spacing.rowHeight,
    borderRadius: t.radius.r4,
    backgroundColor: t.colors.surface,
    borderWidth: t.border.hairline,
    borderColor: t.colors.lineSeparatorStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLabel: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
  },
  error: {
    ...t.typography.meta,
    color: t.colors.textDestructive,
    textAlign: 'center',
  },
}));
