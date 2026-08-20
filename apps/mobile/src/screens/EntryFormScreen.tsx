import { ChevronDown, Plus, Search } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category, Entry, Photo } from '../api/client';
import {
  createCategory,
  createEntry,
  deleteEntry,
  deletePhoto,
  reorderPhotos,
  saveColorRecent,
  updateEntry,
} from '../api/client';
import { MAX_PHOTOS, PhotoGrid } from '../entries/PhotoGrid';
import type { ProcessedPhoto } from '../photos/processPhoto';
import { processPhoto } from '../photos/processPhoto';
import { uploadPhotos } from '../photos/uploadPhotos';
import { CategoryIcon } from '../calendar/CategoryIcon';
import { dateHeading } from '../calendar/dateLabel';
import { ColorPresetPicker, isPresetColor } from '../categories/ColorPresetPicker';
import { decodeContent, encodeContent } from '../entries/content';
import type { EntryDraft } from '../entries/drafts';
import { clearDraft, newDraftId, saveDraft } from '../entries/drafts';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

type Props = {
  accessToken: string;
  date: string;
  categories: Category[];
  /** When present, the form edits this Entry instead of creating one. */
  entry?: Entry;
  /** A retained failed save (#14): the form opens prefilled from it and 儲存 retries. */
  draft?: EntryDraft;
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
// server never parses (ADR-0004). With an entry prop the form edits instead
// of creating. Photos arrive with #8.
export function EntryFormScreen({
  accessToken,
  date,
  categories,
  entry,
  draft,
  onDone,
  onCategoriesChanged,
}: Props) {
  // A draft outranks the entry: it holds the newer, unsaved intent.
  const initialContent = draft
    ? decodeContent(draft.content)
    : entry
      ? decodeContent(entry.content)
      : null;
  const initialCategoryId = draft ? draft.categoryId : entry?.categoryId;
  const initialSubcategoryId = draft ? draft.subcategoryId : entry?.subcategoryId;
  const [category, setCategory] = useState<Category | null>(
    initialCategoryId ? (categories.find((c) => c.id === initialCategoryId) ?? null) : null,
  );
  const [subcategory, setSubcategory] = useState<Category | null>(
    initialSubcategoryId ? (categories.find((c) => c.id === initialSubcategoryId) ?? null) : null,
  );
  const [query, setQuery] = useState('');
  // The quick step's pending top-level category name, or null when not creating.
  const [creating, setCreating] = useState<string | null>(null);
  // string, not TokenColor: the color drawer's custom picks are free values.
  const [newColor, setNewColor] = useState<string>(firstPreset);
  const [addingSub, setAddingSub] = useState(false);
  const [subName, setSubName] = useState('');
  // Categories created in this form session, until the parent refetches /me.
  const [created, setCreated] = useState<Category[]>([]);
  const [title, setTitle] = useState(initialContent?.title ?? '');
  const [note, setNote] = useState(initialContent?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [photosFailed, setPhotosFailed] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>(entry?.photos ?? []);
  const [stagedPhotos, setStagedPhotos] = useState<ProcessedPhoto[]>(draft?.photos ?? []);
  // The OS may purge the cache files a draft's photo URIs point at; prune the
  // unreadable ones on restore so a retry saves what survives instead of
  // failing forever, and say so.
  const [photosMissing, setPhotosMissing] = useState(false);
  // Where a failed save is kept (#14). A restored draft keeps its id so the
  // retry overwrites in place and success clears the right slot.
  const [draftId] = useState(() => draft?.id ?? newDraftId());
  // Set once createEntry lands, so a photo-failure retry updates instead of
  // creating a duplicate Entry.
  const [savedEntryId, setSavedEntryId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!draft || draft.photos.length === 0) return;
    let active = true;
    void Promise.all(
      draft.photos.map((photo) =>
        fetch(photo.fullUri).then(
          (response) => response.ok,
          () => false,
        ),
      ),
    ).then((readable) => {
      if (!active || readable.every(Boolean)) return;
      setPhotosMissing(true);
      setStagedPhotos((prev) => prev.filter((p) => readable[draft.photos.indexOf(p)] !== false));
    });
    return () => {
      active = false;
    };
  }, [draft]);

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

  const dateLabel = dateHeading(date);

  const save = async () => {
    if (!canSave || category === null) return;
    setSaving(true);
    setFailed(false);
    setPhotosFailed(false);
    const content = encodeContent({ title: title.trim(), note });
    const refinement = subcategory !== null ? { subcategoryId: subcategory.id } : {};
    // Draft retention (#14): any failure keeps the full Entry — words and the
    // staged photos' local copies — locally, and 儲存 stays the retry.
    const keepDraft = (entryId: string | undefined) =>
      saveDraft({
        id: draftId,
        date,
        ...(entryId !== undefined ? { entryId } : {}),
        categoryId: category.id,
        ...refinement,
        content,
        photos: stagedPhotos,
        savedAt: new Date().toISOString(),
      });
    let entryId = entry?.id ?? draft?.entryId ?? savedEntryId;
    try {
      if (entryId !== undefined) {
        await updateEntry(accessToken, entryId, {
          categoryId: category.id,
          ...refinement,
          content,
        });
      } else {
        const created = await createEntry(accessToken, {
          date,
          categoryId: category.id,
          ...refinement,
          content,
        });
        entryId = created.id;
        setSavedEntryId(created.id);
      }
    } catch {
      setFailed(true);
      setSaving(false);
      await keepDraft(entryId);
      return;
    }
    try {
      if (entryId !== undefined && stagedPhotos.length > 0) {
        await uploadPhotos(accessToken, entryId, stagedPhotos);
      }
    } catch {
      // The Entry's words reached the server; the photos wait in the draft,
      // pinned to entryId so the retry updates instead of duplicating.
      setPhotosFailed(true);
      setSaving(false);
      await keepDraft(entryId);
      return;
    }
    await clearDraft(draftId);
    onDone(true);
  };

  const photoCount = existingPhotos.length + stagedPhotos.length;

  const addPhotos = () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(strings.photos.addPhoto, undefined, [
        { text: strings.photos.takePhoto, onPress: () => void pickPhotos('camera') },
        { text: strings.photos.fromLibrary, onPress: () => void pickPhotos('library') },
        { text: strings.entryForm.cancel, style: 'cancel' },
      ]);
      return;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [strings.photos.takePhoto, strings.photos.fromLibrary, strings.entryForm.cancel],
        cancelButtonIndex: 2,
      },
      (choice) => {
        if (choice === 0) void pickPhotos('camera');
        if (choice === 1) void pickPhotos('library');
      },
    );
  };

  const pickPhotos = async (source: 'camera' | 'library') => {
    const remaining = MAX_PHOTOS - photoCount;
    if (remaining < 1) return;
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      result = await ImagePicker.launchCameraAsync({ quality: 1, exif: true });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 1,
        exif: true,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
      });
    }
    if (result.canceled) return;
    const processed = await Promise.all(result.assets.slice(0, remaining).map(processPhoto));
    setStagedPhotos((prev) => [...prev, ...processed]);
  };

  const removeGridPhoto = (key: string) => {
    if (key.startsWith('staged:')) {
      const index = Number(key.slice('staged:'.length));
      setStagedPhotos((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    const id = key.slice('photo:'.length);
    Alert.alert(strings.photos.removeConfirmTitle, undefined, [
      { text: strings.entryForm.cancel, style: 'cancel' },
      {
        text: strings.photos.remove,
        style: 'destructive',
        onPress: () => {
          deletePhoto(accessToken, id)
            .then(() => setExistingPhotos((prev) => prev.filter((p) => p.id !== id)))
            .catch(() => Alert.alert(strings.entryForm.saveFailed));
        },
      },
    ]);
  };

  // Drag order: existing photos persist through the API; staged photos hold
  // their block after the existing ones until upload, so a cross-block drag
  // snaps back on the next render (registration appends).
  const reorderGridPhotos = (keys: string[]) => {
    const existingIds = keys.filter((k) => k.startsWith('photo:')).map((k) => k.slice('photo:'.length));
    const stagedIndexes = keys.filter((k) => k.startsWith('staged:')).map((k) => Number(k.slice('staged:'.length)));
    setStagedPhotos((prev) => stagedIndexes.map((i) => prev[i]));
    const currentIds = existingPhotos.map((p) => p.id);
    if (existingIds.length === currentIds.length && existingIds.some((id, i) => id !== currentIds[i])) {
      const previous = existingPhotos;
      setExistingPhotos(existingIds.map((id) => previous.find((p) => p.id === id)!));
      if (entry) {
        reorderPhotos(accessToken, entry.id, existingIds)
          .then((list) => setExistingPhotos(list.photos))
          .catch(() => setExistingPhotos(previous));
      }
    }
  };

  const confirmDelete = () => {
    if (!entry) return;
    Alert.alert(strings.entryForm.deleteConfirmTitle, undefined, [
      { text: strings.entryForm.cancel, style: 'cancel' },
      {
        text: strings.entryForm.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          deleteEntry(accessToken, entry.id)
            .then(() => onDone(true))
            .catch(() => setFailed(true));
        },
      },
    ]);
  };

  const confirmCreateCategory = async () => {
    if (creating === null) return;
    setFailed(false);
    try {
      const made = await createCategory(accessToken, { name: creating, color: newColor });
      // A custom color earns its recents slot only once a category wears it.
      if (!isPresetColor(newColor)) {
        void saveColorRecent(accessToken, newColor).catch(() => undefined);
      }
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
          <Text style={styles.headerTitle}>
            {entry ? strings.entryForm.editTitle : strings.day.addEntry}
          </Text>
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
            <ColorPresetPicker
              value={newColor}
              onChange={setNewColor}
              accessToken={accessToken}
              existingColors={topLevel.map((c) => c.color)}
            />
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
                onPress={() => {
                  setCreating(null);
                  setFailed(false);
                }}
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
            <PhotoGrid
              photos={[
                ...existingPhotos.map((p) => ({ key: `photo:${p.id}`, uri: p.thumbUrl })),
                ...stagedPhotos.map((p, i) => ({ key: `staged:${i}`, uri: p.thumbUri })),
              ]}
              editable={{ onAdd: addPhotos, onRemove: removeGridPhoto, onReorder: reorderGridPhotos }}
            />
            {photosMissing ? (
              <Text style={styles.notice}>{strings.entryForm.draftPhotosMissing}</Text>
            ) : null}
            {failed ? <Text style={styles.error}>{strings.entryForm.saveFailed}</Text> : null}
            {photosFailed ? (
              <Text style={styles.error}>{strings.entryForm.photoUploadFailed}</Text>
            ) : null}
            {entry ? (
              <Pressable accessibilityRole="button" style={styles.deleteButton} onPress={confirmDelete}>
                <Text style={styles.deleteLabel}>{strings.entryForm.delete}</Text>
              </Pressable>
            ) : null}
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
                    setFailed(false);
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
  // Padding-based sizing, no forced height and no inherited lineHeight:
  // iOS TextInput clips CJK glyphs inside a forced line box and top-anchors
  // the placeholder inside a fixed height; letting it wrap its natural line
  // centers both (Simon, 2026-08-19, two rounds).
  subInput: {
    fontSize: t.typography.meta.fontSize,
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
  deleteButton: {
    alignItems: 'center',
    paddingVertical: t.spacing.space5,
  },
  deleteLabel: {
    ...t.typography.entryTitle,
    color: t.colors.textDestructive,
  },
  error: {
    ...t.typography.meta,
    color: t.colors.textDestructive,
  },
  notice: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
  },
}));
