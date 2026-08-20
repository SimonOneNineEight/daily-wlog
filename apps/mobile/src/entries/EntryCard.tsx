import { GripHorizontal } from 'lucide-react-native';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { CategoryIcon } from '../calendar/CategoryIcon';
import { createStyles, theme } from '../theme';

import { PhotoGrid } from './PhotoGrid';

type Props = {
  title: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  subcategoryName?: string;
  note?: string;
  photos?: { id: string; thumbUrl: string }[];
  dragging?: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

// Day-view entry card per the canvas EntryCard: category icon, title, the
// category · subcategory line, note preview, and a grip. The photo grid
// arrives with #8, the card shadow when elevation tokens land.
export function EntryCard({
  title,
  categoryName,
  categoryColor,
  categoryIcon,
  subcategoryName,
  note,
  photos,
  dragging,
  onPress,
  onLongPress,
}: Props) {
  const categoryLine = subcategoryName ? `${categoryName} · ${subcategoryName}` : categoryName;
  // Card inner width: screen minus the day view's gutters and card padding.
  const cardGridWidth =
    useWindowDimensions().width - theme.spacing.screenGutter * 2 - theme.spacing.cardPadding * 2;
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.card, dragging && styles.cardDragging]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
    >
      <View style={styles.headerRow}>
        {/* Centered on the title's line box, so icon and title glyphs sit on
            one visual line (the line box carries leading above the glyph). */}
        <View style={styles.iconHolder}>
          <CategoryIcon icon={categoryIcon} color={categoryColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.categoryLine} numberOfLines={1}>
            {categoryLine}
          </Text>
        </View>
        <GripHorizontal size={18} color={theme.colors.textQuaternary} strokeWidth={2} />
      </View>
      {note ? (
        <Text style={styles.note} numberOfLines={3}>
          {note}
        </Text>
      ) : null}
      {photos && photos.length > 0 ? (
        <View style={styles.photos}>
          <PhotoGrid
            photos={photos.map((p) => ({ key: p.id, uri: p.thumbUrl }))}
            width={cardGridWidth}
          />
        </View>
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
  iconHolder: {
    height: t.typography.entryTitle.lineHeight,
    justifyContent: 'center',
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
  photos: {
    marginTop: t.spacing.space5,
  },
}));
