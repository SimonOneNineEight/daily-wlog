import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { Category } from '../api/client';
import { createEntry } from '../api/client';
import { encodeContent } from '../entries/content';
import { strings } from '../i18n/strings';
import { createStyles } from '../theme';

type Props = {
  accessToken: string;
  date: string;
  categories: Category[];
  onDone: (saved: boolean) => void;
};

// The tracer-bullet entry form (#5): pick an existing category, type a
// title, optionally a note, save. Title is required by this form, not by the
// server — the title lives inside the opaque content blob the server never
// parses (ADR-0004). Inline category creation and subcategories arrive
// with #9.
export function EntryFormScreen({ accessToken, date, categories, onDone }: Props) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSave = !saving && categoryId !== null && title.trim() !== '';

  const save = async () => {
    if (!canSave || categoryId === null) return;
    setSaving(true);
    setFailed(false);
    try {
      await createEntry(accessToken, {
        date,
        categoryId,
        content: encodeContent({ title: title.trim(), note }),
      });
      onDone(true);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => onDone(false)}>
          <Text style={styles.headerAction}>{strings.entryForm.cancel}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{strings.day.addEntry}</Text>
        <Pressable accessibilityRole="button" disabled={!canSave} onPress={() => void save()}>
          <Text style={canSave ? styles.headerAction : styles.headerActionDisabled}>
            {strings.entryForm.save}
          </Text>
        </Pressable>
      </View>

      <View style={styles.categoryRow}>
        {categories.map((category) => {
          const selected = category.id === categoryId;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              style={[styles.categoryChip, selected && styles.categoryChipSelected]}
              onPress={() => setCategoryId(category.id)}
            >
              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
              <Text style={styles.categoryLabel}>{category.name}</Text>
            </Pressable>
          );
        })}
      </View>

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
    </View>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
    paddingHorizontal: t.spacing.screenGutter,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: t.spacing.navBarHeight,
  },
  headerTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
  },
  headerAction: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
  },
  headerActionDisabled: {
    ...t.typography.entryTitle,
    color: t.colors.controlDisabledFg,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.space4,
    paddingVertical: t.spacing.space5,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space3,
    paddingHorizontal: t.spacing.space5,
    paddingVertical: t.spacing.space3,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    borderWidth: t.border.hairline,
    borderColor: t.colors.lineSeparator,
  },
  categoryChipSelected: {
    backgroundColor: t.colors.surfaceFillStrong,
    borderColor: t.colors.focusRing,
  },
  categoryDot: {
    width: t.dot.sizeList,
    height: t.dot.sizeList,
    borderRadius: t.radius.pill,
  },
  categoryLabel: {
    ...t.typography.meta,
    color: t.colors.textPrimary,
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
    marginTop: t.spacing.space5,
    textAlignVertical: 'top',
  },
  placeholder: {
    color: t.colors.textPlaceholder,
  },
  error: {
    ...t.typography.meta,
    color: t.colors.textDestructive,
    marginTop: t.spacing.space5,
  },
}));
