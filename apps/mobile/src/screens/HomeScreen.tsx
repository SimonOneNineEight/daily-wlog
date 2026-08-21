import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '../api/client';
import type { CalendarFilter } from '../calendar/filter';
import { emptyFilter } from '../calendar/filter';
import { localDateString } from '../calendar/monthMath';
import { createStyles } from '../theme';

import { DayScreen } from './DayScreen';
import { EntryFormScreen } from './EntryFormScreen';
import { MonthScreen } from './MonthScreen';
import { SettingsScreen } from './SettingsScreen';
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
  | { name: 'settings' }
  | { name: 'year' };

// Home lands on the month view (#6); the day list, entry form, settings, and
// year view are routes behind it. Real navigation infrastructure can replace
// this switch when the screen graph outgrows it.
export function HomeScreen({ accessToken, categories, onCategoriesChanged }: Props) {
  const [route, setRoute] = useState<Route>({ name: 'month' });
  const [monthRefresh, setMonthRefresh] = useState(0);
  // One lens across every calendar surface (#13); resets on cold launch.
  const [filter, setFilter] = useState<CalendarFilter>(emptyFilter);
  const bumpMonth = () => setMonthRefresh((n) => n + 1);

  if (route.name === 'day') {
    return (
      <DayScreen
        accessToken={accessToken}
        categories={categories}
        date={route.date}
        filter={filter}
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
        filter={filter}
        onChangeFilter={setFilter}
        onCategoriesChanged={onCategoriesChanged}
        onOpenMonth={(year, month) => setRoute({ name: 'month', focus: { year, month } })}
        onBack={() => setRoute({ name: 'month' })}
      />
    );
  }
  if (route.name === 'settings') {
    return (
      <SettingsScreen
        accessToken={accessToken}
        onBack={() => setRoute({ name: 'month' })}
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
          filter={filter}
          onChangeFilter={setFilter}
          onOpenDay={(date) => setRoute({ name: 'day', date })}
          onAddEntry={() => setRoute({ name: 'form', date: localDateString(new Date()) })}
          onOpenSettings={() => setRoute({ name: 'settings' })}
          onCategoriesChanged={onCategoriesChanged}
          onOpenYear={() => setRoute({ name: 'year' })}
        />
      </View>
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
}));
