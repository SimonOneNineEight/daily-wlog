import { ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '../api/client';
import { createCategory, deleteCategory, updateCategory } from '../api/client';
import { CategoryIcon } from '../calendar/CategoryIcon';
import { ColorPresetPicker } from '../categories/ColorPresetPicker';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

// The drawn icon set offered by the editor (lucide, consistent weight — no
// emoji per the design bans). The canvas's editor shows no icon picker, so
// this section is derived from the ticket's AC; the glyph names all resolve
// through CategoryIcon's lookup.
const ICON_CHOICES = [
  'briefcase',
  'dumbbell',
  'utensils',
  'plane',
  'book-open',
  'heart',
  'music',
  'camera',
  'coffee',
  'home',
  'car',
  'tag',
] as const;

const firstPreset = Object.values(theme.categories)[0].base;

type Props = {
  accessToken: string;
  categories: Category[];
  onBack: () => void;
  onCategoriesChanged: () => void;
};

type Editing = { mode: 'create'; parent?: Category } | { mode: 'edit'; id: string };

// Category management (#10) per the canvas CategoriesScreen: the two-level
// list, and one editor serving create and edit. Subcategories are managed
// from inside their parent's editor; icon and color sections disappear for
// them (they inherit both).
export function CategoriesScreen({ accessToken, categories, onBack, onCategoriesChanged }: Props) {
  const [editing, setEditing] = useState<Editing | null>(null);

  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  if (editing) {
    const target = editing.mode === 'edit' ? categories.find((c) => c.id === editing.id) : undefined;
    return (
      <CategoryEditor
        key={editing.mode === 'edit' ? editing.id : `create-${editing.parent?.id ?? 'top'}`}
        accessToken={accessToken}
        target={target}
        parent={
          editing.mode === 'create'
            ? editing.parent
            : target?.parentId
              ? categories.find((c) => c.id === target.parentId)
              : undefined
        }
        childrenOfTarget={target ? childrenOf(target.id) : []}
        onOpen={(next) => setEditing(next)}
        onClose={() => setEditing(null)}
        onCategoriesChanged={onCategoriesChanged}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.day.back}
          style={styles.navButton}
          onPress={onBack}
        >
          <ChevronLeft size={22} color={theme.colors.iconDefault} strokeWidth={2} />
        </Pressable>
        <Text style={styles.navTitle}>{strings.categories.title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.categories.add}
          style={styles.navButton}
          onPress={() => setEditing({ mode: 'create' })}
        >
          <Plus size={22} color={theme.colors.iconDefault} strokeWidth={2} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          {topLevel.map((category, index) => {
            const children = childrenOf(category.id);
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                style={[styles.row, index < topLevel.length - 1 && styles.rowDivided]}
                onPress={() => setEditing({ mode: 'edit', id: category.id })}
              >
                <CategoryIcon icon={category.icon} color={category.color} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{category.name}</Text>
                  {children.length > 0 ? (
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                      {children.map((c) => c.name).join('、')}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={16} color={theme.colors.textQuaternary} strokeWidth={2} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type EditorProps = {
  accessToken: string;
  /** The category being edited; undefined when creating. */
  target?: Category;
  /** The parent when editing/creating a Subcategory. */
  parent?: Category;
  childrenOfTarget: Category[];
  onOpen: (editing: Editing) => void;
  onClose: () => void;
  onCategoriesChanged: () => void;
};

function CategoryEditor({
  accessToken,
  target,
  parent,
  childrenOfTarget,
  onOpen,
  onClose,
  onCategoriesChanged,
}: EditorProps) {
  const isSub = parent !== undefined;
  const [name, setName] = useState(target?.name ?? '');
  const [color, setColor] = useState(target?.color ?? firstPreset);
  const [icon, setIcon] = useState(target?.icon ?? 'tag');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSave = !saving && name.trim() !== '';
  const deletable = target !== undefined && target.inUse !== true && target.hasChildren !== true;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setFailed(false);
    const trimmed = name.trim();
    try {
      if (target) {
        const patch: { name?: string; color?: string; icon?: string } = {};
        if (trimmed !== target.name) patch.name = trimmed;
        if (!isSub && color !== target.color) patch.color = color;
        if (!isSub && icon !== target.icon) patch.icon = icon;
        if (Object.keys(patch).length > 0) {
          await updateCategory(accessToken, target.id, patch);
          onCategoriesChanged();
        }
      } else {
        const made = await createCategory(accessToken, {
          name: trimmed,
          color: isSub ? parent.color : color,
          ...(isSub ? { parentId: parent.id } : {}),
        });
        // The create endpoint auto-assigns the tag glyph; a picked icon is a
        // follow-up patch (top-level only).
        if (!isSub && icon !== made.icon) {
          await updateCategory(accessToken, made.id, { icon });
        }
        onCategoriesChanged();
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

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.day.back}
          style={styles.navButton}
          onPress={onClose}
        >
          <ChevronLeft size={22} color={theme.colors.iconDefault} strokeWidth={2} />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          {target ? target.name : strings.categories.add}
        </Text>
        <Pressable accessibilityRole="button" disabled={!canSave} onPress={() => void save()}>
          <Text style={canSave ? styles.navAction : styles.navActionDisabled}>
            {target ? strings.categories.done : strings.categories.create}
          </Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.identityRow}>
          <CategoryIcon
            icon={isSub ? (parent?.icon ?? 'tag') : icon}
            color={isSub ? (parent?.color ?? color) : color}
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

        {!isSub ? (
          <>
            <ColorPresetPicker value={color} onChange={setColor} />
            <View>
              <Text style={styles.sectionHeader}>{strings.categories.iconHeader}</Text>
              <View style={styles.iconGrid}>
                {ICON_CHOICES.map((choice) => (
                  <Pressable
                    key={choice}
                    accessibilityRole="button"
                    style={[styles.iconCell, icon === choice && styles.iconCellSelected]}
                    onPress={() => setIcon(choice)}
                  >
                    <CategoryIcon icon={choice} color={color} />
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : null}

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
                  <Text style={styles.rowTitle}>{child.name}</Text>
                  <Pencil size={16} color={theme.colors.textQuaternary} strokeWidth={2} />
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
              <Text style={styles.deleteLabel}>{strings.categories.deleteCategory}</Text>
            </Pressable>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space4,
    height: t.spacing.navBarHeight,
    paddingHorizontal: t.spacing.space4,
  },
  navButton: {
    width: t.spacing.hitMin,
    height: t.spacing.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
    flex: 1,
  },
  navAction: {
    ...t.typography.entryTitle,
    color: t.colors.textPrimary,
    paddingHorizontal: t.spacing.space5,
  },
  navActionDisabled: {
    ...t.typography.entryTitle,
    color: t.colors.controlDisabledFg,
    paddingHorizontal: t.spacing.space5,
  },
  body: {
    gap: t.spacing.space7,
    paddingHorizontal: t.spacing.screenGutter,
    paddingTop: t.spacing.space5,
    paddingBottom: t.spacing.space10,
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
  rowSubtitle: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
    marginTop: t.spacing.space1,
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.space4,
  },
  iconCell: {
    width: t.spacing.hitMin,
    height: t.spacing.hitMin,
    borderRadius: t.radius.r4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
  },
  iconCellSelected: {
    borderWidth: 1.5,
    borderColor: t.colors.focusRing,
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
}));
