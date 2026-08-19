import { ChevronDown, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '../api/client';
import { createEntry } from '../api/client';
import { CategoryIcon } from '../calendar/CategoryIcon';
import { encodeContent } from '../entries/content';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

type Props = {
  accessToken: string;
  date: string;
  categories: Category[];
  onDone: (saved: boolean) => void;
};

// The entry form per the canvas: category comes first (search field + list),
// and only a chosen category reveals the title and note fields. Title is
// required by this form, not by the server — the title lives inside the
// opaque content blob the server never parses (ADR-0004). The 建立「…」
// no-match row and photos arrive with #9 and #8.
export function EntryFormScreen({ accessToken, date, categories, onDone }: Props) {
  const [category, setCategory] = useState<Category | null>(null);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSave = !saving && category !== null && title.trim() !== '';
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const [, monthPart, dayPart] = date.split('-').map(Number);
  const weekday = strings.month.weekdaysFull[new Date(`${date}T00:00:00`).getDay()];
  const dateLabel = strings.month.dateLabel(monthPart, dayPart, weekday);

  const save = async () => {
    if (!canSave || category === null) return;
    setSaving(true);
    setFailed(false);
    try {
      await createEntry(accessToken, {
        date,
        categoryId: category.id,
        content: encodeContent({ title: title.trim(), note }),
      });
      onDone(true);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" style={styles.headerSide} onPress={() => onDone(false)}>
          <Text style={styles.cancelLabel}>{strings.entryForm.cancel}</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{strings.day.addEntry}</Text>
          <Text style={styles.headerSubtitle}>{dateLabel}</Text>
        </View>
        <View style={styles.headerSideEnd}>
          <Pressable
            accessibilityRole="button"
            disabled={!canSave}
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={() => void save()}
          >
            <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>
              {strings.entryForm.save}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {category ? (
          <>
            <Pressable
              accessibilityRole="button"
              style={styles.selectedRow}
              onPress={() => setCategory(null)}
            >
              <CategoryIcon icon={category.icon} color={category.color} />
              <Text style={styles.selectedName}>{category.name}</Text>
              <ChevronDown size={17} color={theme.colors.textQuaternary} strokeWidth={2} />
            </Pressable>
            <TextInput
              style={styles.titleInput}
              placeholder={strings.entryForm.titlePlaceholder}
              placeholderTextColor={styles.placeholder.color}
              maxLength={40}
              autoFocus
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.noteInput}
              placeholder={strings.entryForm.notePlaceholder}
              placeholderTextColor={styles.placeholder.color}
              multiline
              value={note}
              onChangeText={setNote}
            />
            {failed ? <Text style={styles.error}>{strings.entryForm.saveFailed}</Text> : null}
          </>
        ) : (
          <>
            <View style={styles.searchField}>
              <Search size={16} color={theme.colors.iconMuted} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder={strings.entryForm.categoryPlaceholder}
                placeholderTextColor={styles.placeholder.color}
                value={query}
                onChangeText={setQuery}
              />
            </View>
            <View style={styles.pickerCard}>
              {filtered.map((c, index) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  style={[styles.pickerRow, index < filtered.length - 1 && styles.pickerRowDivided]}
                  onPress={() => setCategory(c)}
                >
                  <CategoryIcon icon={c.icon} color={c.color} />
                  <Text style={styles.pickerName}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: t.spacing.navBarHeight,
    paddingHorizontal: t.spacing.screenGutter,
  },
  headerSide: {
    minWidth: t.spacing.fabSize,
    justifyContent: 'center',
  },
  headerSideEnd: {
    minWidth: t.spacing.fabSize,
    alignItems: 'flex-end',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
  },
  headerSubtitle: {
    ...t.typography.meta,
    color: t.colors.textSecondary,
  },
  cancelLabel: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
  },
  saveButton: {
    backgroundColor: t.colors.controlPrimaryBg,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.space6,
    paddingVertical: t.spacing.space3,
  },
  saveButtonDisabled: {
    backgroundColor: t.colors.controlDisabledBg,
  },
  saveLabel: {
    ...t.typography.meta,
    color: t.colors.controlPrimaryFg,
  },
  saveLabelDisabled: {
    color: t.colors.controlDisabledFg,
  },
  body: {
    gap: t.spacing.space6,
    paddingHorizontal: t.spacing.screenGutter,
    paddingTop: t.spacing.space6,
    paddingBottom: t.spacing.space10,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space3,
    height: 38,
    paddingHorizontal: t.spacing.space5,
    backgroundColor: t.colors.surfaceFill,
    borderRadius: t.radius.r4,
  },
  searchInput: {
    ...t.typography.note,
    color: t.colors.textPrimary,
    flex: 1,
    paddingVertical: 0,
  },
  pickerCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    overflow: 'hidden',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space5,
    minHeight: t.spacing.rowHeight,
    paddingVertical: t.spacing.rowPaddingY,
    paddingHorizontal: t.spacing.cardPadding,
  },
  pickerRowDivided: {
    borderBottomWidth: t.border.hairline,
    borderBottomColor: t.colors.lineSeparator,
  },
  pickerName: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
    flex: 1,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space5,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    paddingVertical: t.spacing.space5,
    paddingHorizontal: t.spacing.cardPadding,
  },
  selectedName: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
    flex: 1,
  },
  titleInput: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.r3,
    paddingHorizontal: t.spacing.cardPadding,
    height: t.spacing.rowHeight,
  },
  noteInput: {
    ...t.typography.note,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.r3,
    paddingHorizontal: t.spacing.cardPadding,
    paddingTop: t.spacing.space5,
    minHeight: t.spacing.rowHeight * 3,
    textAlignVertical: 'top',
  },
  placeholder: {
    color: t.colors.textPlaceholder,
  },
  error: {
    ...t.typography.meta,
    color: t.colors.textDestructive,
  },
}));
