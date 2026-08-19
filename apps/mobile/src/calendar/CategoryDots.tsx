import { Text, View } from 'react-native';

import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

import { dayDots } from './monthMath';

type Props = {
  colors: string[];
};

/** Up to four dots in entry order, touching (0px gap); overflow becomes a plain 「+」. */
export function CategoryDots({ colors }: Props) {
  const { shown, overflow } = dayDots(colors, theme.dot.maxPerDay);
  return (
    <View style={styles.row}>
      {shown.map((color, index) => (
        <View key={index} style={[styles.dot, { backgroundColor: color }]} />
      ))}
      {overflow > 0 ? <Text style={styles.overflow}>{strings.month.dotOverflow}</Text> : null}
    </View>
  );
}

const styles = createStyles((t) => ({
  // Fixed to dot height: the 「+」 label's taller line box must center around
  // the dots without pushing the whole row (and every dot) lower than on
  // days that have no overflow.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.dot.gap,
    height: t.dot.size,
  },
  dot: {
    width: t.dot.size,
    height: t.dot.size,
    borderRadius: t.radius.pill,
  },
  overflow: {
    ...t.typography.dotOverflow,
    color: t.colors.textTertiary,
    marginLeft: t.spacing.space1,
  },
}));
