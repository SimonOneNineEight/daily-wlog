import { ChevronLeft, ChevronRight, Plus, Tags } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import type { Category } from '../api/client';
import { getMonth, listEntries } from '../api/client';
import type { PanelEntry } from '../calendar/DayPanel';
import { DayPanel } from '../calendar/DayPanel';
import { MonthGrid } from '../calendar/MonthGrid';
import { monthKey, shiftMonth } from '../calendar/monthMath';
import { decodeContent } from '../entries/content';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

type Props = {
  accessToken: string;
  categories: Category[];
  /** Injectable for tests; defaults to the device's now. */
  today?: Date;
  onOpenDay: (date: string) => void;
  onAddEntry: () => void;
  /** Opens category management (#10); #15's settings may rehome this. */
  onOpenCategories?: () => void;
  /** Bump to refetch the visible month (after a save elsewhere). */
  refresh?: number;
};

function dateString(year: number, month: number, day: number): string {
  return `${monthKey(year, month)}-${String(day).padStart(2, '0')}`;
}

// The app's face (#6): the month grid with dots, the selected-day panel, and
// the persistent +. Swipe and chevrons both move months.
export function MonthScreen({
  accessToken,
  categories,
  today = new Date(),
  onOpenDay,
  onAddEntry,
  onOpenCategories,
  refresh = 0,
}: Props) {
  const todayParts = {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
  const [view, setView] = useState({
    year: todayParts.year,
    month: todayParts.month,
    day: todayParts.day,
  });
  const visible = { year: view.year, month: view.month };
  const selectedDay = view.day;
  const [dotColors, setDotColors] = useState<Record<number, string[]>>({});
  const [panelEntries, setPanelEntries] = useState<PanelEntry[]>([]);

  const selectedDate = dateString(visible.year, visible.month, selectedDay);
  const categoryOf = (categoryId: string) => categories.find((c) => c.id === categoryId);
  const colorOf = (categoryId: string) => categoryOf(categoryId)?.color ?? theme.colors.iconMuted;

  useEffect(() => {
    let active = true;
    getMonth(accessToken, monthKey(visible.year, visible.month))
      .then((month) => {
        if (!active) return;
        const byDay: Record<number, string[]> = {};
        for (const day of month.days) {
          byDay[Number(day.date.slice(-2))] = day.categoryIds.map(colorOf);
        }
        setDotColors(byDay);
      })
      .catch(() => {
        if (active) setDotColors({});
      });
    return () => {
      active = false;
    };
    // colorOf changes only with categories, which arrive with the token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, visible.year, visible.month, categories, refresh]);

  useEffect(() => {
    let active = true;
    listEntries(accessToken, selectedDate)
      .then((list) => {
        if (!active) return;
        setPanelEntries(
          list.entries.map((entry) => ({
            id: entry.id,
            title: decodeContent(entry.content)?.title ?? strings.day.unreadable,
            color: colorOf(entry.categoryId),
            icon: categoryOf(entry.categoryId)?.icon ?? 'tag',
          })),
        );
      })
      .catch(() => {
        if (active) setPanelEntries([]);
      });
    return () => {
      active = false;
    };
    // refresh is an intentional extra trigger, not a data dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, selectedDate, categories, refresh]);

  // Functional update: consecutive chevron presses (or a fast swipe after a
  // press) must each move from the latest month, not a stale closure.
  const moveMonth = (delta: number) => {
    setView((prev) => {
      const next = shiftMonth(prev.year, prev.month, delta);
      const isTodayMonth = next.year === todayParts.year && next.month === todayParts.month;
      return { ...next, day: isTodayMonth ? todayParts.day : 1 };
    });
  };

  // Swipe: a three-page pager recentered after each settle, so both
  // directions always have a neighbor to swipe into.
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView | null>(null);
  const onPagerSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
    if (page !== 1) {
      moveMonth(page - 1);
      pagerRef.current?.scrollTo({ x: width, animated: false });
    }
  };

  const weekdayOfSelected = new Date(visible.year, visible.month - 1, selectedDay).getDay();

  return (
    <View style={styles.screen}>
      <View style={styles.navBar}>
        <View>
          <Text style={styles.navTitle}>{strings.month.title(visible.month)}</Text>
          <Text style={styles.navSubtitle}>{strings.month.yearLabel(visible.year)}</Text>
        </View>
        <View style={styles.navActions}>
          {onOpenCategories ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.categories.title}
              style={styles.navButton}
              onPress={onOpenCategories}
            >
              <Tags size={20} color={theme.colors.iconDefault} strokeWidth={2} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.month.prevMonth}
            style={styles.navButton}
            onPress={() => moveMonth(-1)}
          >
            <ChevronLeft size={20} color={theme.colors.iconDefault} strokeWidth={2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.month.nextMonth}
            style={styles.navButton}
            onPress={() => moveMonth(1)}
          >
            <ChevronRight size={20} color={theme.colors.iconDefault} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={pagerRef}
        testID="month-pager"
        style={styles.pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: width, y: 0 }}
        onMomentumScrollEnd={onPagerSettle}
      >
        {[-1, 0, 1].map((delta) => {
          const page = shiftMonth(visible.year, visible.month, delta);
          return (
            <View key={delta} style={{ width }} testID={delta === 0 ? 'month-page-current' : undefined}>
              <MonthGrid
                year={page.year}
                month={page.month}
                days={delta === 0 ? dotColors : {}}
                today={
                  page.year === todayParts.year && page.month === todayParts.month
                    ? todayParts.day
                    : undefined
                }
                selected={delta === 0 ? selectedDay : undefined}
                onSelectDay={(day) => {
                  if (day === selectedDay) {
                    onOpenDay(selectedDate);
                  } else {
                    setView((prev) => ({ ...prev, day }));
                  }
                }}
              />
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.panelHolder}>
        <DayPanel
          dateLabel={strings.month.dateLabel(
            visible.month,
            selectedDay,
            strings.month.weekdaysFull[weekdayOfSelected],
          )}
          entries={panelEntries}
          onOpen={() => onOpenDay(selectedDate)}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.day.addEntry}
        style={styles.fab}
        onPress={onAddEntry}
      >
        <Plus size={24} color={theme.colors.controlPrimaryFg} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.screenGutter,
    paddingTop: t.spacing.space6,
    paddingBottom: t.spacing.space4,
  },
  navTitle: {
    ...t.typography.navTitle,
    color: t.colors.textPrimary,
  },
  navSubtitle: {
    ...t.typography.meta,
    color: t.colors.textSecondary,
  },
  navActions: {
    flexDirection: 'row',
    gap: t.spacing.space4,
  },
  pager: {
    flexGrow: 0,
  },
  navButton: {
    width: t.spacing.hitMin,
    height: t.spacing.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelHolder: {
    paddingHorizontal: t.spacing.screenGutter,
    paddingTop: t.spacing.panelGap,
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: t.spacing.fabInset,
    bottom: t.spacing.fabInset,
    width: t.spacing.fabSize,
    height: t.spacing.fabSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.controlPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
