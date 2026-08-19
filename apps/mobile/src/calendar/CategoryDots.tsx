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
          <Plus
            size={theme.dot.size + theme.spacing.space1}
            color={theme.colors.textTertiary}
            strokeWidth={2.5}
          />
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
  overflow: {
    marginLeft: t.spacing.space1,
  },
}));
