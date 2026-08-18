import { Pressable, Text, View } from 'react-native';

import { strings } from '../i18n/strings';
import { createStyles } from '../theme';

import { CategoryDots } from './CategoryDots';
import { buildWeeks } from './monthMath';

type Props = {
  year: number;
  month: number;
  /** Day number → that day's dot colors in entry order. */
  days: Record<number, string[]>;
  today?: number;
  selected?: number;
  onSelectDay: (day: number) => void;
};

/** Apple Calendar-style month grid per the design canvas. */
export function MonthGrid({ year, month, days, today, selected, onSelectDay }: Props) {
  return (
    <View>
      <View style={styles.weekdayRow}>
        {strings.month.weekdaysShort.map((weekday) => (
          <Text key={weekday} style={styles.weekday}>
            {weekday}
          </Text>
        ))}
      </View>
      {buildWeeks(year, month).map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((cell, cellIndex) => {
            const isToday = !cell.outside && cell.day === today;
            const isSelected = !cell.outside && cell.day === selected;
            return (
              <Pressable
                key={cellIndex}
                accessibilityRole="button"
                disabled={cell.outside}
                style={styles.cell}
                onPress={() => onSelectDay(cell.day)}
              >
                <View
                  style={[
                    styles.numeralHolder,
                    isToday && styles.numeralToday,
                    isSelected && !isToday && styles.numeralSelected,
                  ]}
                >
                  <Text
                    style={[
                      isToday || isSelected ? styles.numeralStrong : styles.numeral,
                      isToday && styles.numeralOnDark,
                      cell.outside && styles.numeralOutside,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
                <CategoryDots colors={cell.outside ? [] : (days[cell.day] ?? [])} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// The 26px numeral circle and its 1.5px selection ring are the canvas's own
// values (DayCell.jsx); neither is a spacing token.
const styles = createStyles((t) => ({
  weekdayRow: {
    flexDirection: 'row',
    paddingTop: t.spacing.space3,
    paddingBottom: t.spacing.space4,
  },
  weekday: {
    ...t.typography.weekday,
    color: t.colors.textTertiary,
    flex: 1,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    borderTopWidth: t.border.hairline,
    borderTopColor: t.colors.lineGrid,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: t.spacing.space3,
    height: t.spacing.gridCellHeight,
    paddingTop: t.spacing.space3,
  },
  numeralHolder: {
    width: 26,
    height: 26,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeralToday: {
    backgroundColor: t.colors.surfaceToday,
  },
  numeralSelected: {
    borderWidth: 1.5,
    borderColor: t.colors.textPrimary,
  },
  numeral: {
    ...t.typography.dayNumeral,
    color: t.colors.textPrimary,
  },
  numeralStrong: {
    ...t.typography.dayNumeralStrong,
    color: t.colors.textPrimary,
  },
  numeralOnDark: {
    color: t.colors.textOnDark,
  },
  numeralOutside: {
    color: t.colors.textQuaternary,
  },
}));
