import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category, Entry } from '../api/client';
import { listEntries, reorderDay } from '../api/client';
import { decodeContent } from '../entries/content';
import { EntryCard } from '../entries/EntryCard';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

import { EntryFormScreen } from './EntryFormScreen';

type Props = {
  accessToken: string;
  categories: Category[];
  /** The date whose Entries this screen shows, YYYY-MM-DD. */
  date: string;
  onBack?: () => void;
  /** Called after an Entry changes here (save, edit, delete, reorder). */
  onEntrySaved?: () => void;
  onCategoriesChanged?: () => void;
};

// The day view (#7): the date's Entries as cards; long-press drag reorders
// and persists, tap edits, the form's 刪除紀錄 deletes.
export function DayScreen({ accessToken, categories, date, onBack, onEntrySaved, onCategoriesChanged }: Props) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);

  // Bumping refresh reloads the list (after a save/edit/delete).
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

  const changed = () => {
    setRefresh((n) => n + 1);
    onEntrySaved?.();
  };

  if (composing || editing) {
    return (
      <EntryFormScreen
        accessToken={accessToken}
        date={date}
        categories={categories}
        entry={editing ?? undefined}
        onCategoriesChanged={onCategoriesChanged}
        onDone={(saved) => {
          setComposing(false);
          setEditing(null);
          if (saved) changed();
        }}
      />
    );
  }

  const persistOrder = async (ordered: Entry[]) => {
    try {
      const result = await reorderDay(accessToken, date, ordered.map((e) => e.id));
      setEntries(result.entries);
      onEntrySaved?.();
    } catch {
      // The optimistic order stays on screen; the next load restores truth.
      setFailed(true);
    }
  };

  const [, monthPart, dayPart] = date.split('-').map(Number);
  const weekday = strings.month.weekdaysFull[new Date(`${date}T00:00:00`).getDay()];
  const heading = strings.month.dateLabel(monthPart, dayPart, weekday);

  const renderCard = ({ item, drag, isActive }: RenderItemParams<Entry>) => {
    const category = categories.find((c) => c.id === item.categoryId);
    const content = decodeContent(item.content);
    return (
      <View style={styles.cardHolder}>
        <EntryCard
          title={content?.title ?? strings.day.unreadable}
          categoryName={category?.name ?? ''}
          categoryColor={category?.color ?? theme.colors.iconMuted}
          categoryIcon={category?.icon ?? 'tag'}
          note={content?.note || undefined}
          dragging={isActive}
          onPress={() => setEditing(item)}
          onLongPress={drag}
        />
      </View>
    );
  };

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
      {failed ? <Text style={styles.muted}>{strings.day.loadFailed}</Text> : null}
      {entries !== null && entries.length === 0 && !failed ? (
        <Text style={styles.muted}>{strings.day.empty}</Text>
      ) : null}
      <DraggableFlatList
        data={entries ?? []}
        keyExtractor={(entry) => entry.id}
        renderItem={renderCard}
        onDragEnd={({ data }) => {
          setEntries(data);
          void persistOrder(data);
        }}
        containerStyle={styles.listContainer}
        contentContainerStyle={styles.list}
      />
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
  muted: {
    ...t.typography.note,
    color: t.colors.textTertiary,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    gap: t.spacing.space5,
    paddingBottom: t.spacing.space9,
  },
  cardHolder: {
    marginBottom: 0,
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
