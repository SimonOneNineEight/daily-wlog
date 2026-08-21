import { Text, View } from 'react-native';

import { strings } from '../i18n/strings';
import { Pressable } from '../theme/press';
import { createStyles } from '../theme';

type Props = {
  year: number;
  /** 1-based month. */
  month: number;
  /** Day number → the day's first Entry's category color. */
  colors: Record<number, string>;
  /** Today's day number when this mini month contains today. */
  todayDay?: number;
  onPress: () => void;
};

// One mini month of the year view (#12): a recorded day is a solid rounded
// box in its FIRST Entry's color with the numeral punched out in white —
// one color per day, never stripes. Today gets a ring only while uncolored.
export function MiniMonth({ year, month, colors, todayDay, onPress }: Props) {
  const leading = new Date(year, month - 1, 1).getDay();
  const dayCount = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: dayCount }, (_, i) => i + 1),
  ];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.year.monthLabel(month)}
      style={styles.month}
      onPress={onPress}
    >
      <Text style={styles.label}>{strings.year.monthLabel(month)}</Text>
      <View style={styles.grid}>
        {cells.map((day, index) => {
          const color = day ? colors[day] : undefined;
          const isToday = day !== null && day === todayDay;
          return (
            <View key={index} style={styles.cell}>
              {day !== null ? (
                <View
                  testID={color ? `year-day-${month}-${day}` : undefined}
                  style={[
                    styles.box,
                    color ? { backgroundColor: color } : null,
                    !color && isToday ? styles.boxToday : null,
                  ]}
                >
                  <Text style={[styles.numeral, color ? styles.numeralOnColor : null]}>{day}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = createStyles((t) => ({
  month: {},
  label: {
    ...t.typography.meta,
    fontWeight: '600',
    color: t.colors.textPrimary,
    marginBottom: t.spacing.space3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    paddingRight: t.spacing.space1,
    marginBottom: t.spacing.space1,
  },
  box: {
    height: t.yearBox.size,
    borderRadius: t.yearBox.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxToday: {
    borderWidth: 1,
    borderColor: t.colors.textPrimary,
  },
  numeral: {
    ...t.typography.yearNumeral,
    color: t.colors.textTertiary,
  },
  numeralOnColor: {
    color: t.colors.textOnDark,
  },
}));
