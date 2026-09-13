import { Tags } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '../api/client';
import { getYear } from '../api/client';
import type { HiddenSet } from '../calendar/hidden';
import { hiddenParams, nothingHidden } from '../calendar/hidden';
import { CategorySheet } from '../calendar/CategorySheet';
import { MiniMonth } from '../calendar/MiniMonth';
import { useStrings } from '../i18n/AppLanguageProvider';
import { Pressable } from '../theme/press';
import { createStyles, theme } from '../theme';

type Props = {
  accessToken: string;
  categories: Category[];
  /** Injectable for tests; defaults to the device's now. */
  today?: Date;
  /** Land on this year instead of the current one — the month view's
   * zoom-out hands over the year it was showing (#40). */
  initialYear?: number;
  /** The persistent hidden-set (#30), owned by HomeScreen. */
  hidden?: HiddenSet;
  onChangeHidden?: (hidden: HiddenSet) => void;
  /** Fired after the 類別 sheet changes a category, so /me refetches. */
  onCategoriesChanged?: () => void;
  onOpenMonth: (year: number, month: number) => void;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

// The year wheel (#27): ±150 years around the viewed year, recentered on
// every open — practically endless in both directions, future allowed
// (backfilling old memories is the product). Fixed row height so the list
// can start centered.
const WHEEL_SPAN = 150;
const WHEEL_ROW_HEIGHT = 44;

// The year view (#12): twelve mini months, each recorded day a solid box in
// its first Entry's color — the "look how much life I've captured" screen.
// One endpoint call delivers the whole year.
export function YearScreen({
  accessToken,
  categories,
  today = new Date(),
  initialYear,
  hidden = nothingHidden,
  onChangeHidden,
  onCategoriesChanged,
  onOpenMonth,
}: Props) {
  const strings = useStrings();
  const [year, setYear] = useState(initialYear ?? today.getFullYear());
  const isCurrentYear = year === today.getFullYear();
  const [colorsByMonth, setColorsByMonth] = useState<Record<number, Record<number, string>>>({});
  const [totalEntries, setTotalEntries] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getYear(accessToken, String(year), hiddenParams(hidden))
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
  }, [accessToken, year, categories, hidden]);

  // Year ↔ year swipes (#26), the month pager's gesture family; the mini
  // months' vertical scroll passes underneath the horizontal flings.
  const flingNext = Gesture.Fling()
    .direction(Directions.LEFT)
    .runOnJS(true)
    .withTestId('year-fling-next')
    .onStart(() => setYear((current) => current + 1));
  const flingPrev = Gesture.Fling()
    .direction(Directions.RIGHT)
    .runOnJS(true)
    .withTestId('year-fling-prev')
    .onStart(() => setYear((current) => current - 1));

  return (
    <GestureDetector gesture={Gesture.Exclusive(flingNext, flingPrev)}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.navBar}>
          {/* No back and no chevrons (ratified 2026-09-10): swipes page the
              years, tapping a month leaves, and the title opens the wheel. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.year.pickYear}
            style={styles.navTitleButton}
            onPress={() => setWheelOpen(true)}
          >
            <Text style={styles.navTitle}>{strings.year.title(year)}</Text>
          </Pressable>
          {onChangeHidden ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.categories.title}
              style={styles.navButton}
              onPress={() => setSheetOpen(true)}
            >
              <Tags size={20} color={theme.colors.iconDefault} strokeWidth={2} />
            </Pressable>
          ) : null}
          {/* 今天 returns this surface to now (#40). It used to leave for
              today's month view; navigation depth now never changes. The
              word replaces the canvas's calendar glyph (ratified
              2026-09-12). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.year.today}
            style={styles.todayButton}
            onPress={() => setYear(today.getFullYear())}
          >
            <Text style={styles.todayLabel}>{strings.year.today}</Text>
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
        {sheetOpen && onChangeHidden ? (
          <CategorySheet
            accessToken={accessToken}
            categories={categories}
            hidden={hidden}
            onChange={onChangeHidden}
            onCategoriesChanged={() => onCategoriesChanged?.()}
            onClose={() => setSheetOpen(false)}
          />
        ) : null}
        {wheelOpen ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.entryForm.cancel}
              feedback="none"
              style={styles.wheelScrim}
              onPress={() => setWheelOpen(false)}
            />
            <View style={styles.wheelCard}>
              <FlatList
                testID="year-wheel"
                data={Array.from({ length: WHEEL_SPAN * 2 + 1 }, (_, i) => year - WHEEL_SPAN + i)}
                keyExtractor={(item) => String(item)}
                getItemLayout={(_, index) => ({
                  length: WHEEL_ROW_HEIGHT,
                  offset: WHEEL_ROW_HEIGHT * index,
                  index,
                })}
                // Two rows above the viewed year: it sits centered in the
                // five-row window.
                initialScrollIndex={WHEEL_SPAN - 2}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    style={styles.wheelRow}
                    onPress={() => {
                      setYear(item);
                      setWheelOpen(false);
                    }}
                  >
                    <Text style={item === year ? styles.wheelYearCurrent : styles.wheelYear}>
                      {strings.year.title(item)}
                    </Text>
                  </Pressable>
                )}
              />
            </View>
          </>
        ) : null}
      </SafeAreaView>
    </GestureDetector>
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
  todayButton: {
    height: t.spacing.hitMin,
    justifyContent: 'center',
    paddingHorizontal: t.spacing.space2,
  },
  todayLabel: {
    ...t.typography.note,
    color: t.colors.controlGhostFg,
  },
  navButton: {
    width: t.spacing.hitMin,
    height: t.spacing.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleButton: {
    flex: 1,
    height: t.spacing.hitMin,
    justifyContent: 'center',
  },
  navTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
  },
  wheelScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.scrim,
  },
  // The wheel drops in behind the title: a floating card under the nav bar.
  wheelCard: {
    position: 'absolute',
    top: t.spacing.navBarHeight,
    left: t.spacing.space4,
    // Wide enough for a four-digit 年 row plus card padding; not a token.
    width: 132,
    height: WHEEL_ROW_HEIGHT * 5,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    borderWidth: t.border.hairline,
    borderColor: t.colors.lineSeparator,
    overflow: 'hidden',
  },
  wheelRow: {
    height: WHEEL_ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: t.spacing.cardPadding,
  },
  wheelYear: {
    ...t.typography.entryTitle,
    color: t.colors.textSecondary,
  },
  wheelYearCurrent: {
    ...t.typography.entryTitle,
    fontWeight: '600',
    color: t.colors.textPrimary,
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
