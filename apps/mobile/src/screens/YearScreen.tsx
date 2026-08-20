import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '../api/client';
import { getYear } from '../api/client';
import { MiniMonth } from '../calendar/MiniMonth';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

type Props = {
  accessToken: string;
  categories: Category[];
  /** Injectable for tests; defaults to the device's now. */
  today?: Date;
  onOpenMonth: (year: number, month: number) => void;
  onBack: () => void;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

// The year view (#12): twelve mini months, each recorded day a solid box in
// its first Entry's color — the "look how much life I've captured" screen.
// One endpoint call delivers the whole year.
export function YearScreen({ accessToken, categories, today = new Date(), onOpenMonth, onBack }: Props) {
  const [year, setYear] = useState(today.getFullYear());
  const isCurrentYear = year === today.getFullYear();
  const [colorsByMonth, setColorsByMonth] = useState<Record<number, Record<number, string>>>({});
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    let active = true;
    getYear(accessToken, String(year))
      .then((data) => {
        if (!active) return;
        const byMonth: Record<number, Record<number, string>> = {};
        for (const day of data.days) {
          const month = Number(day.date.slice(5, 7));
          const dayNumber = Number(day.date.slice(8, 10));
          const color = categories.find((c) => c.id === day.categoryId)?.color;
          if (!color) continue;
          (byMonth[month] ??= {})[dayNumber] = color;
        }
        setColorsByMonth(byMonth);
        setTotalEntries(data.totalEntries);
      })
      .catch(() => {
        if (active) setColorsByMonth({});
      });
    return () => {
      active = false;
    };
  }, [accessToken, year, categories]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.day.back}
          style={styles.navButton}
          onPress={onBack}
        >
          <ChevronLeft size={22} color={theme.colors.iconDefault} strokeWidth={2} />
        </Pressable>
        <Text style={styles.navTitle}>{strings.year.title(year)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.year.prevYear}
          style={styles.navButton}
          onPress={() => setYear(year - 1)}
        >
          <ChevronLeft size={20} color={theme.colors.iconDefault} strokeWidth={2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.year.nextYear}
          style={styles.navButton}
          onPress={() => setYear(year + 1)}
        >
          <ChevronRight size={20} color={theme.colors.iconDefault} strokeWidth={2} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.year.today}
          style={styles.navButton}
          onPress={() => onOpenMonth(today.getFullYear(), today.getMonth() + 1)}
        >
          <CalendarDays size={20} color={theme.colors.iconDefault} strokeWidth={2} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.grid}>
          {MONTHS.map((month) => (
            <View key={month} style={styles.gridItem}>
              <MiniMonth
                year={year}
                month={month}
                colors={colorsByMonth[month] ?? {}}
                todayDay={
                  isCurrentYear && month === today.getMonth() + 1 ? today.getDate() : undefined
                }
                onPress={() => onOpenMonth(year, month)}
              />
            </View>
          ))}
        </View>
        <Text style={styles.countLabel}>
          {isCurrentYear
            ? strings.year.countLabel(totalEntries)
            : strings.year.totalLabel(totalEntries)}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space4,
    height: t.spacing.navBarHeight,
    paddingHorizontal: t.spacing.space4,
  },
  navButton: {
    width: t.spacing.hitMin,
    height: t.spacing.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
    flex: 1,
  },
  body: {
    paddingHorizontal: t.spacing.screenGutter,
    paddingTop: t.spacing.space6,
    paddingBottom: t.spacing.space10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: t.spacing.space8,
  },
  gridItem: {
    width: '48%',
  },
  countLabel: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
    marginTop: t.spacing.space7,
    marginHorizontal: t.spacing.space1,
  },
}));
