import { Pressable, Text, View } from 'react-native';

import type { Category } from '../api/client';
import { supabase } from '../auth/supabase';
import { strings } from '../i18n/strings';
import { createStyles } from '../theme';

import { DayScreen } from './DayScreen';

type Props = {
  accessToken: string;
  categories: Category[];
};

// Home is today's day list (#5). Sign-out moves into settings with #15;
// month-view navigation arrives with #6.
export function HomeScreen({ accessToken, categories }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <DayScreen accessToken={accessToken} categories={categories} />
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
    marginBottom: t.spacing.space6,
  },
  signOutLabel: {
    ...t.typography.meta,
    color: t.colors.textSecondary,
  },
}));
