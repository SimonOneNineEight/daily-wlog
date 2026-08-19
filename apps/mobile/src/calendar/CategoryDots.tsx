import { Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { createStyles, theme } from '../theme';

import { dayDots } from './monthMath';

type Props = {
  colors: string[];
};

/**
 * Up to four dots in entry order, touching (0px gap); overflow becomes a
 * plain 「+」. The plus is an icon, not text: a text glyph sits on a font
 * baseline and its optical center lands below the dots' centerline on iOS,
 * while an icon centers geometrically.
 */
export function CategoryDots({ colors }: Props) {
  const { shown, overflow } = dayDots(colors, theme.dot.maxPerDay);
  return (
    <View style={styles.row}>
      {shown.map((color, index) => (
        <View key={index} style={[styles.dot, { backgroundColor: color }]} />
      ))}
      {overflow > 0 ? (
        <View testID="dot-overflow" style={styles.overflow}>
          {/* Exactly dot-sized: matching bounds is what makes it read as
              one line — a taller glyph "sticks out" even when centered. */}
          <Plus size={theme.dot.size} color={theme.colors.textTertiary} strokeWidth={3} />
        </View>
      ) : null}
    </View>
  );
}

const styles = createStyles((t) => ({
  // Constant row height on every day so dots sit at the same level whether
  // or not a day overflows.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.dot.gap,
    height: t.typography.dotOverflow.lineHeight,
  },
  dot: {
    width: t.dot.size,
    height: t.dot.size,
    borderRadius: t.radius.pill,
  },
  // Full row height + self-centering: the icon must not depend on the
  // row's cross-axis alignment, which has proven unreliable for Svg
  // children on iOS.
  overflow: {
    height: t.typography.dotOverflow.lineHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: t.spacing.space1,
  },
}));
