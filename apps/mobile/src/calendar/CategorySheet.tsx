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
import type { CalendarFilter } from './filter';

type Props = {
  accessToken: string;
  categories: Category[];
  filter: CalendarFilter;
  onChange: (filter: CalendarFilter) => void;
  onCategoriesChanged: () => void;
  onClose: () => void;
};

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

// The 類別 sheet (ratified 2026-08-20, Apple's Calendars model): one surface
// where the category list is both the calendar's lens and its own manager.
// Tapping a row toggles its checkmark (filtering, union semantics, parents
// include children); the ✎ opens that category's editor; 新增類別 creates.
// Canvas normalization holds: a child pick drops its parent and vice versa.
export function CategorySheet({
  accessToken,
  categories,
  filter,
  onChange,
  onCategoriesChanged,
  onClose,
}: Props) {
  const [editing, setEditing] = useState<Editing | null>(null);

  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

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
          accessibilityLabel={strings.filter.done}
          feedback="none"
          style={styles.scrim}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              style={styles.headerButton}
              onPress={() => onChange({ categoryIds: [], subcategoryIds: [] })}
            >
              <Text style={styles.headerClear}>{strings.filter.clearAll}</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{strings.categories.title}</Text>
            <Pressable accessibilityRole="button" style={styles.headerDone} onPress={onClose}>
              <Text style={styles.headerDoneLabel}>{strings.filter.done}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.card}>
              {topLevel.map((category) => {
                const children = childrenOf(category.id);
                const parentOn = filter.categoryIds.includes(category.id);
                return (
                  <View key={category.id}>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.row, styles.rowDivided]}
                      // Canvas normalization: turning a parent on clears its
                      // own children's picks (it already includes them).
                      onPress={() =>
                        onChange({
                          categoryIds: toggle(filter.categoryIds, category.id),
                          subcategoryIds: parentOn
                            ? filter.subcategoryIds
                            : filter.subcategoryIds.filter(
                                (id) => !children.some((child) => child.id === id),
                              ),
                        })
                      }
                    >
                      <CategoryIcon icon={category.icon} color={category.color} />
                      <Text style={[styles.rowTitle, styles.rowText]}>{category.name}</Text>
                      {parentOn ? (
                        <Check size={18} color={theme.colors.textPrimary} strokeWidth={2} />
                      ) : null}
                      {editButton(() => setEditing({ mode: 'edit', id: category.id }))}
                    </Pressable>
                    {children.map((child) => {
                          const subOn = filter.subcategoryIds.includes(child.id);
                          return (
                            <Pressable
                              key={child.id}
                              accessibilityRole="button"
                              style={[styles.row, styles.rowDivided]}
                              // Canvas normalization: picking a child narrows
                              // the lens, so its parent's selection drops.
                              onPress={() =>
                                onChange({
                                  categoryIds: subOn
                                    ? filter.categoryIds
                                    : filter.categoryIds.filter((id) => id !== category.id),
                                  subcategoryIds: toggle(filter.subcategoryIds, child.id),
                                })
                              }
                            >
                              <View style={styles.subLead}>
                                <View style={[styles.subDot, { backgroundColor: child.color }]} />
                              </View>
                              <Text style={[styles.rowTitle, styles.rowText]}>{child.name}</Text>
                              {subOn || parentOn ? (
                                // Dimmed whenever the parent is on (artboard):
                                // the parent's selection already implies this
                                // child, so its own check reads secondary.
                                <Check
                                  size={18}
                                  color={
                                    parentOn ? theme.colors.textQuaternary : theme.colors.textPrimary
                                  }
                                  strokeWidth={2}
                                />
                              ) : null}
                              {editButton(() => setEditing({ mode: 'edit', id: child.id }))}
                            </Pressable>
                          );
                        })}
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
  headerClear: {
    ...t.typography.entryTitle,
    color: t.colors.controlGhostFg,
  },
  headerTitle: {
    ...t.typography.sectionHeader,
    color: t.colors.textPrimary,
    flex: 1,
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
  expandButton: {
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
  subDot: {
    width: t.dot.sizeList,
    height: t.dot.sizeList,
    borderRadius: t.radius.pill,
    opacity: 0.55,
  },
}));
