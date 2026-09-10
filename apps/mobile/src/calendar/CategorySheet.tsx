import { Check, Pencil, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';

import type { Category } from '../api/client';
import type { Editing } from '../categories/CategoryEditorSheet';
import { CategoryEditorSheet } from '../categories/CategoryEditorSheet';
import { strings } from '../i18n/strings';
import { Pressable } from '../theme/press';
import { createStyles, theme } from '../theme';

import { CategoryIcon } from './CategoryIcon';
import type { HiddenSet } from './hidden';
import {
  allHidden,
  familyIsVisible,
  hideAll,
  nothingHidden,
  toggleFamily,
  toggleSubcategory,
} from './hidden';

type Props = {
  accessToken: string;
  categories: Category[];
  hidden: HiddenSet;
  onChange: (hidden: HiddenSet) => void;
  onCategoriesChanged: () => void;
  onClose: () => void;
};

// The Apple-style check-circle carrying a subcategory row's own state in
// the parent's color: filled with a white check = visible, hollow = hidden.
function CheckCircle({ color, on }: { color: string; on: boolean }) {
  return on ? (
    <View style={[styles.checkCircle, { backgroundColor: color }]}>
      <Check size={13} color={theme.colors.textOnDark} strokeWidth={2.5} />
    </View>
  ) : (
    <View style={[styles.checkCircle, styles.checkCircleHollow, { borderColor: color }]} />
  );
}

// The 類別 sheet as a visibility checklist (#30, DESIGN.md §9, built from
// the ratified text — the artboard requirement was waived by Simon,
// 2026-09-10): one surface fusing visibility with management. Category
// rows toggle by icon-circle fill and a parent's circle is the family
// master switch (lit while any member is visible; tapping shows or hides
// the whole family). Subcategory rows carry their own check-circles, the
// glyph itself telling the level. The ✎ opens the editor; 新增類別
// creates; the header's one toggle is 全部隱藏 / 全部顯示.
export function CategorySheet({
  accessToken,
  categories,
  hidden,
  onChange,
  onCategoriesChanged,
  onClose,
}: Props) {
  const [editing, setEditing] = useState<Editing | null>(null);

  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
  const everythingHidden = allHidden(hidden, categories);

  const target =
    editing?.mode === 'edit' ? categories.find((c) => c.id === editing.id) : undefined;

  const editButton = (open: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.categories.editTitle}
      style={styles.editButton}
      onPress={open}
    >
      <Pencil size={15} color={theme.colors.textQuaternary} strokeWidth={2} />
    </Pressable>
  );

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.categories.done}
          feedback="none"
          style={styles.scrim}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            {/* Rendered first and absolutely spanned, so the title centers
                on the sheet itself, not on the gap the side buttons leave. */}
            <Text style={styles.headerTitle}>{strings.categories.title}</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.headerButton}
              onPress={() =>
                onChange(everythingHidden ? nothingHidden : hideAll(categories))
              }
            >
              <Text style={styles.headerToggle}>
                {everythingHidden ? strings.categories.showAll : strings.categories.hideAll}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.headerDone} onPress={onClose}>
              <Text style={styles.headerDoneLabel}>{strings.categories.done}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.card}>
              {topLevel.map((category) => {
                const children = childrenOf(category.id);
                const familyOn = familyIsVisible(hidden, category, children);
                return (
                  <View key={category.id}>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.row, styles.rowDivided]}
                      onPress={() => onChange(toggleFamily(hidden, category, children))}
                    >
                      <CategoryIcon
                        icon={category.icon}
                        color={category.color}
                        hollow={!familyOn}
                      />
                      <Text style={[styles.rowTitle, styles.rowText]}>{category.name}</Text>
                      {editButton(() => setEditing({ mode: 'edit', id: category.id }))}
                    </Pressable>
                    {children.map((child) => (
                      <Pressable
                        key={child.id}
                        accessibilityRole="button"
                        style={[styles.row, styles.rowDivided]}
                        onPress={() => onChange(toggleSubcategory(hidden, child.id))}
                      >
                        <View style={styles.subLead}>
                          <CheckCircle
                            color={category.color}
                            on={!hidden.subcategoryIds.includes(child.id)}
                          />
                        </View>
                        <Text style={[styles.rowTitle, styles.rowText]}>{child.name}</Text>
                        {editButton(() => setEditing({ mode: 'edit', id: child.id }))}
                      </Pressable>
                    ))}
                  </View>
                );
              })}
              <Pressable
                accessibilityRole="button"
                style={styles.row}
                onPress={() => setEditing({ mode: 'create' })}
              >
                <Plus size={17} color={theme.colors.iconDefault} strokeWidth={2} />
                <Text style={styles.rowTitle}>{strings.categories.add}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
      {editing ? (
        <CategoryEditorSheet
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
          parentChoices={topLevel}
          childrenOfTarget={target ? childrenOf(target.id) : []}
          onOpen={(next) => setEditing(next)}
          onClose={() => setEditing(null)}
          onCategoriesChanged={onCategoriesChanged}
        />
      ) : null}
    </Modal>
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
    maxHeight: '78%',
    backgroundColor: t.colors.background,
    borderTopLeftRadius: t.radius.sheet,
    borderTopRightRadius: t.radius.sheet,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerToggle: {
    ...t.typography.entryTitle,
    color: t.colors.controlGhostFg,
  },
  headerTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  headerDone: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: t.spacing.space5,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.controlPrimaryBg,
  },
  headerDoneLabel: {
    ...t.typography.entryTitle,
    color: t.colors.controlPrimaryFg,
  },
  body: {
    paddingTop: t.spacing.space6,
    paddingHorizontal: t.spacing.screenGutter,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space4,
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
  editButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subLead: {
    width: 22,
    height: 22,
    marginLeft: t.spacing.space9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleHollow: {
    borderWidth: 1.5,
  },
}));
