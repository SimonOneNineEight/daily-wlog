import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Category, Entry } from '../api/client';
import { listEntries } from '../api/client';
import { decodeContent } from '../entries/content';
import { strings } from '../i18n/strings';
import { createStyles } from '../theme';

import { EntryFormScreen } from './EntryFormScreen';

/** The device's local date as YYYY-MM-DD (an Entry date is a calendar day). */
function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

type Props = {
  accessToken: string;
  categories: Category[];
};

// The minimal day list (#5): today's Entries in position order, plus the
// entry form. It proves the round trip; the real day view (cards, reorder,
// edit) is #7 and the month view with tappable dates is #6.
export function DayScreen({ accessToken, categories }: Props) {
  const today = localDateString(new Date());
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [composing, setComposing] = useState(false);

  // Bumping refresh reloads the list (after a save).
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    listEntries(accessToken, today)
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
  }, [accessToken, today, refresh]);

  if (composing) {
    return (
      <EntryFormScreen
        accessToken={accessToken}
        date={today}
        categories={categories}
        onDone={(saved) => {
          setComposing(false);
          if (saved) setRefresh((n) => n + 1);
        }}
      />
    );
  }

  const heading = new Intl.DateTimeFormat('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>{heading}</Text>
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
    </View>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
    paddingHorizontal: t.spacing.screenGutter,
  },
  heading: {
    ...t.typography.navTitle,
    color: t.colors.textPrimary,
    paddingVertical: t.spacing.space6,
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
