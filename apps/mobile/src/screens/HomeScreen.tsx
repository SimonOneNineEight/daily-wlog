import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '../api/client';
import { supabase } from '../auth/supabase';
import { localDateString } from '../calendar/monthMath';
import { strings } from '../i18n/strings';
import { createStyles } from '../theme';

import { CategoriesScreen } from './CategoriesScreen';
import { DayScreen } from './DayScreen';
import { EntryFormScreen } from './EntryFormScreen';
import { MonthScreen } from './MonthScreen';
import { YearScreen } from './YearScreen';

type Props = {
  accessToken: string;
  categories: Category[];
  onCategoriesChanged?: () => void;
};

type Route =
  | { name: 'month'; focus?: { year: number; month: number } }
  | { name: 'day'; date: string }
  | { name: 'form'; date: string }
  | { name: 'categories' }
  | { name: 'year' };

// Home lands on the month view (#6); the day list and entry form are routes
// behind it. Real navigation infrastructure can replace this switch when the
// screen graph outgrows it. Sign-out moves into settings with #15.
export function HomeScreen({ accessToken, categories, onCategoriesChanged }: Props) {
  const [route, setRoute] = useState<Route>({ name: 'month' });
  const [monthRefresh, setMonthRefresh] = useState(0);
  const bumpMonth = () => setMonthRefresh((n) => n + 1);

  if (route.name === 'day') {
    return (
      <DayScreen
        accessToken={accessToken}
        categories={categories}
        date={route.date}
        onBack={() => setRoute({ name: 'month' })}
        onEntrySaved={bumpMonth}
        onCategoriesChanged={onCategoriesChanged}
      />
    );
  }
  if (route.name === 'year') {
    return (
      <YearScreen
        accessToken={accessToken}
        categories={categories}
        onOpenMonth={(year, month) => setRoute({ name: 'month', focus: { year, month } })}
        onBack={() => setRoute({ name: 'month' })}
      />
    );
  }
  if (route.name === 'categories') {
    return (
      <CategoriesScreen
        accessToken={accessToken}
        categories={categories}
        onBack={() => setRoute({ name: 'month' })}
        onCategoriesChanged={() => onCategoriesChanged?.()}
      />
    );
  }
  if (route.name === 'form') {
    return (
      <EntryFormScreen
        accessToken={accessToken}
        date={route.date}
        categories={categories}
        onCategoriesChanged={onCategoriesChanged}
        onDone={(saved) => {
          if (saved) bumpMonth();
          setRoute({ name: 'month' });
        }}
      />
    );
  }
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <MonthScreen
          accessToken={accessToken}
          categories={categories}
          refresh={monthRefresh}
          initialMonth={route.focus}
          onOpenDay={(date) => setRoute({ name: 'day', date })}
          onAddEntry={() => setRoute({ name: 'form', date: localDateString(new Date()) })}
          onOpenCategories={() => setRoute({ name: 'categories' })}
          onOpenYear={() => setRoute({ name: 'year' })}
        />
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
    </SafeAreaView>
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
    alignSelf: 'flex-start',
    paddingVertical: t.spacing.space4,
    paddingHorizontal: t.spacing.screenGutter,
    marginBottom: t.spacing.space4,
  },
  signOutLabel: {
    ...t.typography.meta,
    color: t.colors.textSecondary,
  },
}));
