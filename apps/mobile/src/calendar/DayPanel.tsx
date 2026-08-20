import { ChevronRight, Image as ImageIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

import { CategoryIcon } from './CategoryIcon';

export type PanelEntry = {
  id: string;
  title: string;
  color: string;
  icon: string;
  hasPhotos?: boolean;
};

type Props = {
  dateLabel: string;
  entries: PanelEntry[];
  onOpen: () => void;
};

/** The panel beneath the month grid: the selected day's entry titles with
 * category icons. Tapping anywhere on it opens the day view. */
export function DayPanel({ dateLabel, entries, onOpen }: Props) {
  return (
    <View style={styles.panel}>
      <Pressable accessibilityRole="button" style={styles.header} onPress={onOpen}>
        <Text style={styles.dateLabel}>{dateLabel}</Text>
        <ChevronRight size={16} color={theme.colors.textQuaternary} strokeWidth={2} />
      </Pressable>
      {entries.length === 0 ? (
        <Text style={styles.empty}>{strings.month.emptyDay}</Text>
      ) : (
        entries.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            style={styles.row}
            onPress={onOpen}
          >
            <CategoryIcon icon={entry.icon} color={entry.color} />
            <Text style={styles.title} numberOfLines={1}>
              {entry.title}
            </Text>
            {entry.hasPhotos ? (
              <ImageIcon size={15} color={theme.colors.textQuaternary} strokeWidth={2} />
            ) : null}
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = createStyles((t) => ({
  panel: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.panel,
    overflow: 'hidden',
    paddingBottom: t.spacing.space2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: t.spacing.space5,
    paddingBottom: t.spacing.space4,
    paddingHorizontal: t.spacing.cardPadding,
  },
  dateLabel: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
  },
  empty: {
    ...t.typography.note,
    color: t.colors.textTertiary,
    paddingHorizontal: t.spacing.cardPadding,
    paddingBottom: t.spacing.space6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space5,
    paddingVertical: t.spacing.space4,
    paddingHorizontal: t.spacing.cardPadding,
  },
  title: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
    flex: 1,
  },
}));
