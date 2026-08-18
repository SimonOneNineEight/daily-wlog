import { Pressable, Text, View } from 'react-native';

import { supabase } from '../auth/supabase';
import { strings } from '../i18n/strings';
import { createStyles } from '../theme';

import { HealthScreen } from './HealthScreen';

// Placeholder home until the month view lands (#6): the walking skeleton's
// health readout plus sign-out, which moves into settings with #15.
export function HomeScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <HealthScreen />
      </View>
      <Pressable
        accessibilityRole="button"
        style={styles.signOut}
        onPress={() => {
          void supabase.auth.signOut();
        }}
      >
        <Text style={styles.signOutLabel}>{strings.home.signOut}</Text>
      </Pressable>
    </View>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  body: {
    flex: 1,
  },
  signOut: {
    alignSelf: 'center',
    paddingVertical: t.spacing.space5,
    paddingHorizontal: t.spacing.space8,
    marginBottom: t.spacing.space9,
  },
  signOutLabel: {
    ...t.typography.meta,
    color: t.colors.textSecondary,
  },
}));
