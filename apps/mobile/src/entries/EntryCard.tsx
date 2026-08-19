import { GripHorizontal } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { CategoryIcon } from '../calendar/CategoryIcon';
import { createStyles, theme } from '../theme';

type Props = {
  title: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  note?: string;
  dragging?: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

// Day-view entry card per the canvas EntryCard: category icon, title, the
// category line, note preview, and a grip. The subcategory suffix joins the
// category line with #9, the photo grid with #8, and the card shadow when
// elevation tokens land.
export function EntryCard({
  title,
  categoryName,
  categoryColor,
  categoryIcon,
  note,
  dragging,
  onPress,
  onLongPress,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.card, dragging && styles.cardDragging]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
    >
      <View style={styles.headerRow}>
        <CategoryIcon icon={categoryIcon} color={categoryColor} />
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.categoryLine} numberOfLines={1}>
            {categoryName}
          </Text>
        </View>
        <GripHorizontal size={18} color={theme.colors.textQuaternary} strokeWidth={2} />
      </View>
      {note ? (
        <Text style={styles.note} numberOfLines={3}>
          {note}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = createStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    padding: t.spacing.cardPadding,
  },
  cardDragging: {
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: t.border.hairline,
    borderColor: t.colors.lineSeparatorStrong,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.space5,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
  },
  categoryLine: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
    marginTop: t.spacing.space1,
  },
  note: {
    ...t.typography.note,
    color: t.colors.textSecondary,
    marginTop: t.spacing.space5,
  },
}));
