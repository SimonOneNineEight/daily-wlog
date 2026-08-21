import { Check, ChevronRight, Plus, Trash2 } from 'lucide-react-native';
import { createElement, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, View } from 'react-native';

import type { Category } from '../api/client';
import { createCategory, deleteCategory, saveColorRecent, updateCategory } from '../api/client';
import { CategoryIcon, glyphFor } from '../calendar/CategoryIcon';
import { strings } from '../i18n/strings';
import { Pressable } from '../theme/press';
import { createStyles, theme } from '../theme';

import { ColorPresetPicker, isPresetColor } from './ColorPresetPicker';

// The drawn icon set offered by the editor (lucide, consistent weight — no
// emoji per the design bans); every name resolves through CategoryIcon's
// lookup.
const ICON_CHOICES = [
  'dumbbell', 'volleyball', 'bike', 'waves-ladder', 'mountain', 'footprints',
  'trophy', 'tent', 'plane', 'car', 'train-front', 'bus',
  'ship', 'map-pin', 'utensils', 'coffee', 'soup', 'pizza',
  'croissant', 'cake-slice', 'ice-cream-cone', 'wine', 'glass-water', 'fish',
  'shopping-cart', 'store', 'wallet', 'piggy-bank', 'briefcase', 'laptop',
  'code', 'notebook-pen', 'graduation-cap', 'book-open', 'lightbulb', 'pencil',
  'clock', 'calendar', 'users', 'heart', 'dog', 'cat',
  'paw-print', 'house', 'bed', 'bath', 'shirt', 'sprout',
  'sun', 'moon',
  'music', 'guitar', 'mic', 'headphones', 'film', 'camera',
  'paintbrush', 'palette', 'image', 'tag',
] as const;

const firstPreset = Object.values(theme.categories)[0].base;

export type Editing = { mode: 'create'; parent?: Category } | { mode: 'edit'; id: string };

type Props = {
  accessToken: string;
  /** The category being edited; undefined when creating. */
  target?: Category;
  /** The parent when editing a Subcategory, or preselected when creating. */
  parent?: Category;
  /** Top-level categories offered as the optional parent at creation. */
  parentChoices: Category[];
  childrenOfTarget: Category[];
  onOpen: (editing: Editing) => void;
  onClose: () => void;
  onCategoriesChanged: () => void;
};

// The 分類表單 sheet (#10, canvas artboard), extracted for reuse by the 類別
// sheet. Ratified deviations (Simon, 2026-08-20): the icon picker stays
// available when editing, and subcategories stay an inline list.
export function CategoryEditorSheet(props: Props) {
  return (
    <Modal transparent animationType="slide" onRequestClose={props.onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.entryForm.cancel}
          feedback="none"
          style={styles.scrim}
          onPress={props.onClose}
        />
        <CategoryEditor {...props} />
      </View>
    </Modal>
  );
}

function CategoryEditor({
  accessToken,
  target,
  parent,
  parentChoices,
  childrenOfTarget,
  onOpen,
  onClose,
  onCategoriesChanged,
}: Props) {
  const [name, setName] = useState(target?.name ?? '');
  const [color, setColor] = useState(target?.color ?? firstPreset);
  const [icon, setIcon] = useState(target?.icon ?? 'tag');
  // Create mode offers the optional parent; editing keeps parenthood fixed.
  const [chosenParent, setChosenParent] = useState<Category | undefined>(parent);
  const [parentListOpen, setParentListOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const activeParent = target ? parent : chosenParent;
  const isSub = activeParent !== undefined;

  const canSave = !saving && name.trim() !== '';
  const deletable = target !== undefined && target.inUse !== true && target.hasChildren !== true;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setFailed(false);
    const trimmed = name.trim();
    try {
      let colorApplied = false;
      if (target) {
        const patch: { name?: string; color?: string; icon?: string } = {};
        if (trimmed !== target.name) patch.name = trimmed;
        if (!isSub && color !== target.color) patch.color = color;
        if (!isSub && icon !== target.icon) patch.icon = icon;
        if (Object.keys(patch).length > 0) {
          await updateCategory(accessToken, target.id, patch);
          colorApplied = patch.color !== undefined;
          onCategoriesChanged();
        }
      } else {
        await createCategory(
          accessToken,
          isSub
            ? { name: trimmed, color: activeParent.color, parentId: activeParent.id }
            : { name: trimmed, color, icon },
        );
        colorApplied = !isSub;
        onCategoriesChanged();
      }
      // A custom color earns its recents slot only once a category actually
      // wears it; the save is best-effort.
      if (colorApplied && !isPresetColor(color)) {
        void saveColorRecent(accessToken, color).catch(() => undefined);
      }
      onClose();
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!target) return;
    Alert.alert(strings.categories.deleteConfirmTitle(target.name), undefined, [
      { text: strings.entryForm.cancel, style: 'cancel' },
      {
        text: strings.entryForm.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          deleteCategory(accessToken, target.id)
            .then(() => {
              onCategoriesChanged();
              onClose();
            })
            .catch(() => setFailed(true));
        },
      },
    ]);
  };

  const parentOptions: { id: string | null; name: string; category?: Category }[] = [
    { id: null, name: strings.categories.noParent },
    ...parentChoices.map((choice) => ({ id: choice.id, name: choice.name, category: choice })),
  ];

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHeader}>
        <Pressable accessibilityRole="button" style={styles.headerButton} onPress={onClose}>
          <Text style={styles.headerCancel}>{strings.entryForm.cancel}</Text>
        </Pressable>
        <Text style={styles.sheetTitle} numberOfLines={1}>
          {target ? strings.categories.editTitle : strings.categories.add}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={[styles.headerSave, !canSave && styles.headerSaveDisabled]}
          disabled={!canSave}
          onPress={() => void save()}
        >
          <Text style={styles.headerSaveLabel}>{strings.categories.save}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
        <View style={styles.identityRow}>
          <CategoryIcon
            icon={isSub ? (activeParent.icon ?? 'tag') : icon}
            color={isSub ? activeParent.color : color}
            size={36}
          />
          <TextInput
            style={styles.nameInput}
            placeholder={strings.categories.namePlaceholder}
            placeholderTextColor={styles.placeholder.color}
            value={name}
            onChangeText={setName}
            autoFocus={target === undefined}
          />
        </View>

        <View>
          <Text style={styles.sectionHeader}>{strings.categories.parentHeader}</Text>
          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              style={[styles.row, parentListOpen && styles.rowDivided]}
              disabled={target !== undefined}
              onPress={() => setParentListOpen((open) => !open)}
            >
              <Text style={[styles.rowTitle, styles.rowText]}>
                {activeParent ? activeParent.name : strings.categories.noParent}
              </Text>
              <Text style={styles.rowValue}>
                {isSub ? strings.categories.parentHintSub : strings.categories.parentHintTop}
              </Text>
              <ChevronRight size={16} color={theme.colors.textQuaternary} strokeWidth={2} />
            </Pressable>
            {parentListOpen
              ? parentOptions.map((option, index) => (
                  <Pressable
                    key={option.id ?? 'none'}
                    accessibilityRole="button"
                    style={[styles.row, index < parentOptions.length - 1 && styles.rowDivided]}
                    onPress={() => {
                      setChosenParent(option.category);
                      setParentListOpen(false);
                    }}
                  >
                    {option.category ? (
                      <CategoryIcon icon={option.category.icon} color={option.category.color} />
                    ) : null}
                    <Text style={[styles.rowTitle, styles.rowText]}>{option.name}</Text>
                    {(chosenParent?.id ?? null) === option.id ? (
                      <Check size={18} color={theme.colors.textPrimary} strokeWidth={2} />
                    ) : null}
                  </Pressable>
                ))
              : null}
          </View>
        </View>

        {isSub ? <Text style={styles.explanation}>{strings.categories.inheritHint}</Text> : null}

        {/* Subcategories inherit icon and color: the sections stay visible
            but disabled (canvas: dimmed appearance block). */}
        <View
          style={[styles.appearance, isSub ? styles.inherited : null]}
          pointerEvents={isSub ? 'none' : 'auto'}
        >
          <View>
            <Text style={styles.sectionHeader}>{strings.categories.colorHeader}</Text>
            <ColorPresetPicker
              value={isSub ? activeParent.color : color}
              onChange={setColor}
              accessToken={accessToken}
              icon={icon}
              existingColors={parentChoices
                .filter((choice) => choice.id !== target?.id)
                .map((choice) => choice.color)}
            />
          </View>
          <View>
            <Text style={styles.sectionHeader}>{strings.categories.iconHeader}</Text>
            <ScrollView style={styles.iconCard} nestedScrollEnabled>
              <View style={styles.iconGrid}>
                {ICON_CHOICES.map((choice) => {
                  const selected = isSub
                    ? (activeParent.icon ?? 'tag') === choice
                    : icon === choice;
                  return (
                    <View key={choice} style={styles.iconCellWrap}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={choice}
                        style={[styles.iconCell, selected && styles.iconCellSelected]}
                        onPress={() => setIcon(choice)}
                      >
                        {createElement(glyphFor(choice), {
                          size: 20,
                          color: theme.colors.iconDefault,
                          strokeWidth: 1.75,
                        })}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        {target && !isSub ? (
          <View>
            <Text style={styles.sectionHeader}>{strings.categories.subcategoriesHeader}</Text>
            <View style={styles.card}>
              {childrenOfTarget.map((child) => (
                <Pressable
                  key={child.id}
                  accessibilityRole="button"
                  style={[styles.row, styles.rowDivided]}
                  onPress={() => onOpen({ mode: 'edit', id: child.id })}
                >
                  <Text style={[styles.rowTitle, styles.rowText]}>{child.name}</Text>
                  <ChevronRight size={16} color={theme.colors.textQuaternary} strokeWidth={2} />
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                style={styles.row}
                onPress={() => onOpen({ mode: 'create', parent: target })}
              >
                <Plus size={17} color={theme.colors.iconDefault} strokeWidth={2} />
                <Text style={styles.rowTitle}>{strings.categories.addSubcategory}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {failed ? <Text style={styles.error}>{strings.categories.saveFailed}</Text> : null}

        {target ? (
          target.inUse === true ? (
            <Text style={styles.explanation}>{strings.categories.inUseExplanation}</Text>
          ) : target.hasChildren === true ? (
            <Text style={styles.explanation}>{strings.categories.hasChildrenExplanation}</Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              style={styles.deleteButton}
              onPress={confirmDelete}
              disabled={!deletable}
            >
              <Trash2 size={16} color={theme.colors.textDestructive} strokeWidth={2} />
              <Text style={styles.deleteLabel}>{strings.categories.deleteCategory}</Text>
            </Pressable>
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = createStyles((t) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.scrim,
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: t.colors.background,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space4,
    padding: t.spacing.space4,
    backgroundColor: t.colors.materialBar,
    borderBottomWidth: t.border.hairline,
    borderBottomColor: t.colors.lineSeparator,
  },
  headerButton: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: t.spacing.space4,
  },
  headerCancel: {
    ...t.typography.entryTitle,
    color: t.colors.controlGhostFg,
  },
  sheetTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSave: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: t.spacing.space5,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.controlPrimaryBg,
  },
  headerSaveDisabled: {
    backgroundColor: t.colors.controlDisabledBg,
  },
  headerSaveLabel: {
    ...t.typography.entryTitle,
    color: t.colors.controlPrimaryFg,
  },
  sheetBody: {
    gap: t.spacing.space7,
    paddingHorizontal: t.spacing.screenGutter,
    paddingTop: t.spacing.space6,
    paddingBottom: 32,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space5,
  },
  nameInput: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.r3,
    paddingHorizontal: t.spacing.cardPadding,
    height: t.spacing.rowHeight,
    flex: 1,
  },
  sectionHeader: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
    marginBottom: t.spacing.space4,
    marginLeft: t.spacing.space1,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space5,
    minHeight: t.spacing.rowHeight,
    paddingVertical: t.spacing.rowPaddingY,
    paddingHorizontal: t.spacing.cardPadding,
  },
  rowDivided: {
    borderBottomWidth: t.border.hairline,
    borderBottomColor: t.colors.lineSeparator,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
    flexShrink: 1,
  },
  rowValue: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
  },
  appearance: {
    gap: t.spacing.space7,
  },
  inherited: {
    opacity: 0.4,
  },
  iconCard: {
    maxHeight: 212,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: t.spacing.space5,
    paddingVertical: t.spacing.space5,
    paddingHorizontal: t.spacing.cardPadding,
  },
  iconCellWrap: {
    width: `${100 / 6}%`,
    alignItems: 'center',
  },
  iconCell: {
    width: 40,
    height: 40,
    borderRadius: t.radius.r3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceFill,
  },
  iconCellSelected: {
    borderWidth: 1.5,
    borderColor: t.colors.textPrimary,
  },
  placeholder: {
    color: t.colors.textPlaceholder,
  },
  explanation: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
    marginHorizontal: t.spacing.space1,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.space3,
    height: t.spacing.hitMin,
    paddingHorizontal: t.spacing.space2,
  },
  deleteLabel: {
    ...t.typography.entryTitle,
    color: t.colors.textDestructive,
  },
  error: {
    ...t.typography.meta,
    color: t.colors.textDestructive,
  },
}));
