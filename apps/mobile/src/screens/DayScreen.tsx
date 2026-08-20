import { ChevronLeft, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category, Entry } from '../api/client';
import { listEntries, reorderDay } from '../api/client';
import { dateHeading } from '../calendar/dateLabel';
import { decodeContent } from '../entries/content';
import type { EntryDraft } from '../entries/drafts';
import { listDrafts } from '../entries/drafts';
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
  const [reorderFailed, setReorderFailed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  // Retained failed saves for this date (#14), shown as quiet rows above the
  // list; tapping one reopens the form prefilled, where 儲存 retries.
  const [drafts, setDrafts] = useState<EntryDraft[]>([]);
  const [openDraft, setOpenDraft] = useState<EntryDraft | null>(null);

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

  useEffect(() => {
    let active = true;
    void listDrafts(date).then((found) => {
      if (active) setDrafts(found);
    });
    return () => {
      active = false;
    };
  }, [date, refresh]);

  const changed = () => {
    setRefresh((n) => n + 1);
    onEntrySaved?.();
  };

  if (composing || editing || openDraft) {
    return (
      <EntryFormScreen
        accessToken={accessToken}
        date={date}
        categories={categories}
        // A draft for an already-saved Entry brings its Entry along when the
        // list has it, so the server-side photos still show in the form.
        entry={
          editing ??
          (openDraft?.entryId ? entries?.find((e) => e.id === openDraft.entryId) : undefined)
        }
        draft={openDraft ?? undefined}
        onCategoriesChanged={onCategoriesChanged}
        onDone={(saved) => {
          setComposing(false);
          setEditing(null);
          setOpenDraft(null);
          // A failed attempt in the form may have kept a draft; success
          // cleared one. Either way this date's rows need a fresh read.
          void listDrafts(date).then(setDrafts);
          if (saved) changed();
        }}
      />
    );
  }

  const persistOrder = async (ordered: Entry[]) => {
    try {
      const result = await reorderDay(accessToken, date, ordered.map((e) => e.id));
      setEntries(result.entries);
      setReorderFailed(false);
      onEntrySaved?.();
    } catch {
      // Roll the optimistic order back to server truth and say what failed.
      setReorderFailed(true);
      setRefresh((n) => n + 1);
    }
  };

  const heading = dateHeading(date);

  const renderCard = ({ item, drag, isActive }: RenderItemParams<Entry>) => {
    const category = categories.find((c) => c.id === item.categoryId);
    const subcategory = categories.find((c) => c.id === item.subcategoryId);
    const content = decodeContent(item.content);
    return (
      <View style={styles.cardHolder}>
        <EntryCard
          title={content?.title ?? strings.day.unreadable}
          categoryName={category?.name ?? ''}
          categoryColor={category?.color ?? theme.colors.iconMuted}
          categoryIcon={category?.icon ?? 'tag'}
          subcategoryName={subcategory?.name}
          note={content?.note || undefined}
          photos={item.photos?.map((p) => ({ id: p.id, thumbUrl: p.thumbUrl }))}
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
      {reorderFailed ? <Text style={styles.muted}>{strings.day.reorderFailed}</Text> : null}
      {entries !== null && entries.length === 0 && !failed ? (
        <Text style={styles.muted}>{strings.day.empty}</Text>
      ) : null}
      {/* Kept drafts (#14). No canvas artboard exists for these, so the
          quietest surface consistent with the day view: a plain card with
          the title and a flat 尚未儲存 meta line. */}
      {drafts.map((draft) => (
        <Pressable
          key={draft.id}
          accessibilityRole="button"
          style={styles.draftCard}
          onPress={() => setOpenDraft(draft)}
        >
          <Text style={styles.draftTitle}>
            {decodeContent(draft.content)?.title ?? strings.day.unreadable}
          </Text>
          <Text style={styles.draftMeta}>{strings.day.draftUnsaved}</Text>
        </Pressable>
      ))}
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
        accessibilityLabel={strings.day.addEntry}
        style={styles.fab}
        onPress={() => setComposing(true)}
      >
        <Plus size={24} color={theme.colors.controlPrimaryFg} strokeWidth={2} />
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
  draftCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    paddingVertical: t.spacing.space5,
    paddingHorizontal: t.spacing.cardPadding,
    marginBottom: t.spacing.space5,
    gap: t.spacing.space1,
  },
  draftTitle: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
  },
  draftMeta: {
    ...t.typography.meta,
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
  // The same black + as the month view (Simon's ruling, 2026-08-19,
  // replacing the canvas's inline ghost button); it adds to the viewed day.
  fab: {
    position: 'absolute',
    right: t.spacing.fabInset,
    bottom: t.spacing.fabInset,
    width: t.spacing.fabSize,
    height: t.spacing.fabSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.controlPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
