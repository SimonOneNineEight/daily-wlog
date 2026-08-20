import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { Category } from '../api/client';
import { CategoryIcon } from './CategoryIcon';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

import type { CalendarFilter } from './filter';

type Props = {
  categories: Category[];
  filter: CalendarFilter;
  onChange: (filter: CalendarFilter) => void;
  onClose: () => void;
};

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

// The filter sheet (#13, canvas artboard): a two-level category tree with
// checkmarks. Selecting a parent includes its children (their checks dim to
// show the implication); subcategories also select independently. No cap.
export function FilterSheet({ categories, filter, onChange, onClose }: Props) {
  const [expanded, setExpanded] = useState<string[]>([]);

  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.filter.done}
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
            <Text style={styles.headerTitle}>{strings.filter.title}</Text>
            <Pressable accessibilityRole="button" style={styles.headerDone} onPress={onClose}>
              <Text style={styles.headerDoneLabel}>{strings.filter.done}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.card}>
              {topLevel.map((category, index) => {
                const children = childrenOf(category.id);
                const parentOn = filter.categoryIds.includes(category.id);
                const open = expanded.includes(category.id);
                const lastParent = index === topLevel.length - 1;
                return (
                  <View key={category.id}>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.row, (!lastParent || open) && styles.rowDivided]}
                      onPress={() =>
                        onChange({ ...filter, categoryIds: toggle(filter.categoryIds, category.id) })
                      }
                    >
                      <CategoryIcon icon={category.icon} color={category.color} />
                      <Text style={[styles.rowTitle, styles.rowText]}>{category.name}</Text>
                      {parentOn ? (
                        <Check size={18} color={theme.colors.textPrimary} strokeWidth={2} />
                      ) : null}
                      {children.length > 0 ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            open ? strings.filter.collapse : strings.filter.expand
                          }
                          style={styles.expandButton}
                          onPress={() => setExpanded((prev) => toggle(prev, category.id))}
                        >
                          {open ? (
                            <ChevronUp size={16} color={theme.colors.textQuaternary} strokeWidth={2} />
                          ) : (
                            <ChevronDown size={16} color={theme.colors.textQuaternary} strokeWidth={2} />
                          )}
                        </Pressable>
                      ) : null}
                    </Pressable>
                    {open
                      ? children.map((child, childIndex) => {
                          const subOn = filter.subcategoryIds.includes(child.id);
                          return (
                            <Pressable
                              key={child.id}
                              accessibilityRole="button"
                              style={[
                                styles.row,
                                (!lastParent || childIndex < children.length - 1) &&
                                  styles.rowDivided,
                              ]}
                              onPress={() =>
                                onChange({
                                  ...filter,
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
                            </Pressable>
                          );
                        })
                      : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
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
