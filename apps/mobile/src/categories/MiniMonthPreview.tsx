import { Text, View } from 'react-native';

import { createStyles } from '../theme';

type Props = {
  /** The color under consideration in the drawer. */
  color: string;
  /** The user's current category colors, for side-by-side judgment. */
  existingColors: string[];
};

// A fixed dot arrangement over a 5-week grid: the chosen color alone, and
// beside the user's existing colors — the situations where a bad pick would
// actually hurt. 'chosen' is the drawer color; numbers index existingColors.
const DOT_PATTERN: Record<number, ('chosen' | number)[]> = {
  2: [0],
  5: ['chosen'],
  9: [1, 0],
  12: ['chosen', 0, 1],
  16: [2],
  19: [0, 'chosen'],
  23: ['chosen'],
  27: [1, 2, 'chosen', 0],
};

// Four full weeks: every month has days 1–28, so the numerals stay honest.
const CELLS = 28;

/**
 * The drawer's live preview (#11, ratified design): the chosen color as a
 * real dot on a mini month grid beside the user's existing category colors —
 * the guardrail for fully free colors, not a clamp. Deliberately local to
 * the drawer; the year view owns any shared mini-month rendering.
 */
export function MiniMonthPreview({ color, existingColors }: Props) {
  const existing = existingColors.length > 0 ? existingColors : [color];
  return (
    <View style={styles.grid}>
      {Array.from({ length: CELLS }, (_, index) => (
        <View key={index} style={styles.cell}>
          <Text style={styles.numeral}>{index + 1}</Text>
          <View style={styles.dotRow}>
            {(DOT_PATTERN[index] ?? []).map((dot, dotIndex) =>
              dot === 'chosen' ? (
                <View
                  key={dotIndex}
                  testID="preview-dot-chosen"
                  style={[styles.dot, { backgroundColor: color }]}
                />
              ) : (
                <View
                  key={dotIndex}
                  testID="preview-dot-existing"
                  style={[styles.dot, { backgroundColor: existing[dot % existing.length] }]}
                />
              ),
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = createStyles((t) => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.r3,
    borderWidth: t.border.hairline,
    borderColor: t.colors.lineGrid,
    overflow: 'hidden',
    paddingVertical: t.spacing.space2,
  },
  cell: {
    // 7 columns; height fits the tiny numeral plus a compact dot row.
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: t.spacing.space1,
    gap: t.spacing.space1,
  },
  numeral: {
    ...t.typography.yearNumeral,
    color: t.colors.textQuaternary,
  },
  dotRow: {
    flexDirection: 'row',
    gap: t.dot.gap,
    height: t.dot.sizeCompact,
  },
  dot: {
    width: t.dot.sizeCompact,
    height: t.dot.sizeCompact,
    borderRadius: t.radius.pill,
  },
}));
