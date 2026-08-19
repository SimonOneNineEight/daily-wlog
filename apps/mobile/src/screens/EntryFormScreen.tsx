import { ChevronDown, Plus, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '../api/client';
import { createCategory, createEntry } from '../api/client';
import { CategoryIcon } from '../calendar/CategoryIcon';
import { ColorPresetPicker } from '../categories/ColorPresetPicker';
import { encodeContent } from '../entries/content';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

type Props = {
  accessToken: string;
  date: string;
  categories: Category[];
  onDone: (saved: boolean) => void;
  /** Fired after an inline category/subcategory creation lands server-side. */
  onCategoriesChanged?: () => void;
};

const firstPreset = Object.values(theme.categories)[0].base;

// The entry form per the canvas: category comes first (search field + list),
// and only a chosen category reveals the title and note fields. Typing an
// unmatched name offers 建立「…」 into the in-form quick step (name → color
// pick → 建立類別) with the auto-assigned tag glyph. Title is required by
// this form, not by the server — it lives inside the opaque content blob the
// server never parses (ADR-0004). Photos arrive with #8.
export function EntryFormScreen({ accessToken, date, categories, onDone, onCategoriesChanged }: Props) {
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Category | null>(null);
  const [query, setQuery] = useState('');
  // The quick step's pending top-level category name, or null when not creating.
  const [creating, setCreating] = useState<string | null>(null);
  const [newColor, setNewColor] = useState(firstPreset);
  const [addingSub, setAddingSub] = useState(false);
  const [subName, setSubName] = useState('');
  // Categories created in this form session, until the parent refetches /me.
  const [created, setCreated] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const known = new Set(categories.map((c) => c.id));
  const all = [...categories, ...created.filter((c) => !known.has(c.id))];
  const topLevel = all.filter((c) => !c.parentId);
  const trimmedQuery = query.trim();
  const filtered = topLevel.filter((c) =>
    c.name.toLowerCase().includes(trimmedQuery.toLowerCase()),
  );
  const exactMatch = topLevel.some((c) => c.name.toLowerCase() === trimmedQuery.toLowerCase());
  const children = category ? all.filter((c) => c.parentId === category.id) : [];

  const canSave = !saving && category !== null && title.trim() !== '';

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
        ...(subcategory !== null ? { subcategoryId: subcategory.id } : {}),
        content: encodeContent({ title: title.trim(), note }),
      });
      onDone(true);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  const confirmCreateCategory = async () => {
    if (creating === null) return;
    setFailed(false);
    try {
      const made = await createCategory(accessToken, { name: creating, color: newColor });
      setCreated((prev) => [...prev, made]);
      setCategory(made);
      setSubcategory(null);
      setCreating(null);
      setQuery('');
      onCategoriesChanged?.();
    } catch {
      setFailed(true);
    }
  };

  const confirmCreateSubcategory = async () => {
    const name = subName.trim();
    if (category === null || name === '') return;
    setFailed(false);
    try {
      // Subcategories store the parent's color but always render through the
      // parent, so a later parent recolor carries every child with it.
      const made = await createCategory(accessToken, {
        name,
        color: category.color,
        parentId: category.id,
      });
      setCreated((prev) => [...prev, made]);
      setSubcategory(made);
      setAddingSub(false);
      setSubName('');
      onCategoriesChanged?.();
    } catch {
      setFailed(true);
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
        {creating !== null ? (
          <>
            <View style={styles.createPreview}>
              <CategoryIcon icon="tag" color={newColor} size={36} />
              <Text style={styles.selectedName}>{creating}</Text>
            </View>
            <ColorPresetPicker value={newColor} onChange={setNewColor} />
            <View style={styles.createActions}>
              <Pressable
                accessibilityRole="button"
                style={styles.confirmButton}
                onPress={() => void confirmCreateCategory()}
              >
                <Text style={styles.confirmLabel}>{strings.entryForm.confirmCreate}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.ghostButton}
                onPress={() => setCreating(null)}
              >
                <Text style={styles.ghostLabel}>{strings.entryForm.createBack}</Text>
              </Pressable>
            </View>
            {failed ? <Text style={styles.error}>{strings.entryForm.saveFailed}</Text> : null}
          </>
        ) : category ? (
          <>
            <Pressable
              accessibilityRole="button"
              style={styles.selectedRow}
              onPress={() => {
                setCategory(null);
                setSubcategory(null);
                setAddingSub(false);
              }}
            >
              <CategoryIcon icon={category.icon} color={category.color} />
              <Text style={styles.selectedName}>{category.name}</Text>
              <ChevronDown size={17} color={theme.colors.textQuaternary} strokeWidth={2} />
            </Pressable>

            {/* Subcategory refinement. The brief mocks no subcategory UI, so
                this derives the quietest pattern consistent with the canvas:
                a wrap of pills under the collapsed category row, dots in the
                parent's color (Subcategories inherit icon and color), never
                demanded — tapping the selected pill deselects it. */}
            <View style={styles.subRow}>
              {children.map((sub) => {
                const selected = subcategory?.id === sub.id;
                return (
                  <Pressable
                    key={sub.id}
                    accessibilityRole="button"
                    style={[styles.subPill, selected && styles.subPillSelected]}
                    onPress={() => setSubcategory(selected ? null : sub)}
                  >
                    <View style={[styles.subDot, { backgroundColor: category.color }]} />
                    <Text style={styles.subLabel}>{sub.name}</Text>
                  </Pressable>
                );
              })}
              {addingSub ? (
                <View style={styles.subCreate}>
                  <TextInput
                    style={styles.subInput}
                    placeholder={strings.entryForm.subcategoryPlaceholder}
                    placeholderTextColor={styles.placeholder.color}
                    maxLength={20}
                    autoFocus
                    value={subName}
                    onChangeText={setSubName}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={subName.trim() === ''}
                    onPress={() => void confirmCreateSubcategory()}
                  >
                    <Text style={subName.trim() === '' ? styles.subConfirmDisabled : styles.subConfirm}>
                      {strings.entryForm.confirmSubcategory}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={strings.entryForm.addSubcategory}
                  style={styles.subPill}
                  onPress={() => setAddingSub(true)}
                >
                  <Plus size={13} color={theme.colors.iconDefault} strokeWidth={2} />
                </Pressable>
              )}
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
                  style={[
                    styles.pickerRow,
                    (index < filtered.length - 1 || (trimmedQuery !== '' && !exactMatch)) &&
                      styles.pickerRowDivided,
                  ]}
                  onPress={() => {
                    setCategory(c);
                    setSubcategory(null);
                  }}
                >
                  <CategoryIcon icon={c.icon} color={c.color} />
                  <Text style={styles.pickerName}>{c.name}</Text>
                </Pressable>
              ))}
              {trimmedQuery !== '' && !exactMatch ? (
                <Pressable
                  accessibilityRole="button"
                  style={styles.pickerRow}
                  onPress={() => {
                    setNewColor(firstPreset);
                    setCreating(trimmedQuery);
                  }}
                >
                  <View style={styles.createGlyph}>
                    <Plus size={13} color={theme.colors.iconDefault} strokeWidth={2} />
                  </View>
                  <Text style={styles.pickerName}>{strings.entryForm.createRow(trimmedQuery)}</Text>
                </Pressable>
              ) : null}
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
  createGlyph: {
    width: 22,
    height: 22,
    borderRadius: t.radius.r2,
    backgroundColor: t.colors.surfaceFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space5,
  },
  createActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space4,
  },
  confirmButton: {
    backgroundColor: t.colors.controlPrimaryBg,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.space7,
    paddingVertical: t.spacing.space4,
  },
  confirmLabel: {
    ...t.typography.entryTitle,
    color: t.colors.controlPrimaryFg,
  },
  ghostButton: {
    paddingHorizontal: t.spacing.space5,
    paddingVertical: t.spacing.space4,
  },
  ghostLabel: {
    ...t.typography.entryTitle,
    color: t.colors.controlGhostFg,
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
  subRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: t.spacing.space4,
  },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space3,
    minHeight: t.spacing.space9,
    paddingHorizontal: t.spacing.space5,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    borderWidth: t.border.hairline,
    borderColor: t.colors.lineSeparator,
  },
  subPillSelected: {
    backgroundColor: t.colors.surfaceFillStrong,
    borderColor: t.colors.focusRing,
  },
  subDot: {
    width: t.dot.size,
    height: t.dot.size,
    borderRadius: t.radius.pill,
  },
  subLabel: {
    ...t.typography.meta,
    color: t.colors.textPrimary,
  },
  subCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space4,
  },
  subInput: {
    ...t.typography.meta,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.pill,
    borderWidth: t.border.hairline,
    borderColor: t.colors.lineField,
    paddingHorizontal: t.spacing.space5,
    paddingVertical: t.spacing.space3,
    minWidth: t.spacing.fabSize * 2,
  },
  subConfirm: {
    ...t.typography.meta,
    color: t.colors.textPrimary,
  },
  subConfirmDisabled: {
    ...t.typography.meta,
    color: t.colors.controlDisabledFg,
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
