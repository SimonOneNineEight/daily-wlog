import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category, Entry } from '../api/client';
import { listEntries } from '../api/client';
import { decodeContent } from '../entries/content';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

import { EntryFormScreen } from './EntryFormScreen';

type Props = {
  accessToken: string;
  categories: Category[];
  /** The date whose Entries this screen shows, YYYY-MM-DD. */
  date: string;
  onBack?: () => void;
  /** Called after an Entry is saved from this screen. */
  onEntrySaved?: () => void;
  onCategoriesChanged?: () => void;
};

// The minimal day list (#5), reached from the month view (#6) for any
// tapped date. The real day view (cards, reorder, edit) is #7.
export function DayScreen({ accessToken, categories, date, onBack, onEntrySaved, onCategoriesChanged }: Props) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [composing, setComposing] = useState(false);

  // Bumping refresh reloads the list (after a save).
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    listEntries(accessToken, date)
      .then((result) => {
        if (active) {
          setEntries(result.entries);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [accessToken, date, refresh]);

  if (composing) {
    return (
      <EntryFormScreen
        accessToken={accessToken}
        date={date}
        categories={categories}
        onCategoriesChanged={onCategoriesChanged}
        onDone={(saved) => {
          setComposing(false);
          if (saved) {
            setRefresh((n) => n + 1);
            onEntrySaved?.();
          }
        }}
      />
    );
  }

  const [, monthPart, dayPart] = date.split('-').map(Number);
  const weekday = strings.month.weekdaysFull[new Date(date + 'T00:00:00').getDay()];
  const heading = strings.month.dateLabel(monthPart, dayPart, weekday);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.day.back}
            style={styles.backButton}
            onPress={onBack}
          >
            <ChevronLeft size={22} color={theme.colors.iconDefault} strokeWidth={2} />
          </Pressable>
        ) : null}
        <Text style={styles.heading}>{heading}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {failed ? <Text style={styles.muted}>{strings.day.loadFailed}</Text> : null}
        {entries !== null && entries.length === 0 && !failed ? (
          <Text style={styles.muted}>{strings.day.empty}</Text>
        ) : null}
        {entries?.map((entry) => {
          const category = categories.find((c) => c.id === entry.categoryId);
          const content = decodeContent(entry.content);
          return (
            <View key={entry.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: category?.color ?? styles.fallbackDot.backgroundColor }]} />
              <Text style={styles.rowTitle} numberOfLines={1}>
                {content?.title ?? strings.day.unreadable}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        style={styles.addButton}
        onPress={() => setComposing(true)}
      >
        <Text style={styles.addLabel}>{strings.day.addEntry}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
    paddingHorizontal: t.spacing.screenGutter,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space3,
    paddingVertical: t.spacing.space6,
  },
  backButton: {
    width: t.spacing.space9,
    height: t.spacing.space9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    ...t.typography.navTitle,
    color: t.colors.textPrimary,
  },
  list: {
    gap: t.spacing.space4,
    paddingBottom: t.spacing.space9,
  },
  muted: {
    ...t.typography.note,
    color: t.colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space5,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    paddingHorizontal: t.spacing.cardPadding,
    minHeight: t.spacing.rowHeight,
  },
  dot: {
    width: t.dot.sizeList,
    height: t.dot.sizeList,
    borderRadius: t.radius.pill,
  },
  fallbackDot: {
    backgroundColor: t.colors.textQuaternary,
  },
  rowTitle: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
    flexShrink: 1,
  },
  addButton: {
    alignSelf: 'center',
    backgroundColor: t.colors.controlPrimaryBg,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.space8,
    height: t.spacing.rowHeight,
    justifyContent: 'center',
    marginBottom: t.spacing.space6,
  },
  addLabel: {
    ...t.typography.entryTitle,
    color: t.colors.controlPrimaryFg,
  },
}));
