import { X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { Category } from '../api/client';
import { strings } from '../i18n/strings';
import { createStyles, theme } from '../theme';

import type { CalendarFilter } from './filter';
import { hasFilter } from './filter';

type Props = {
  categories: Category[];
  filter: CalendarFilter;
  onChange: (filter: CalendarFilter) => void;
};

// The active-filter chips above the calendar (#13, canvas): loud and
// removable — one chip per selection with its color dot, plus 全部清除.
export function FilterChips({ categories, filter, onChange }: Props) {
  if (!hasFilter(filter)) return null;

  const byId = (id: string) => categories.find((c) => c.id === id);
  const chips = [
    ...filter.categoryIds.map((id) => ({
      id,
      kind: 'category' as const,
      label: byId(id)?.name ?? '',
      color: byId(id)?.color ?? theme.colors.iconMuted,
    })),
    ...filter.subcategoryIds.map((id) => ({
      id,
      kind: 'subcategory' as const,
      label: byId(id)?.name ?? '',
      color: byId(id)?.color ?? theme.colors.iconMuted,
    })),
  ];

  const remove = (chip: (typeof chips)[number]) =>
    onChange(
      chip.kind === 'category'
        ? { ...filter, categoryIds: filter.categoryIds.filter((id) => id !== chip.id) }
        : { ...filter, subcategoryIds: filter.subcategoryIds.filter((id) => id !== chip.id) },
    );

  return (
    <View style={styles.rowWrap}>
      {chips.map((chip) => (
        <Pressable
          key={`${chip.kind}:${chip.id}`}
          accessibilityRole="button"
          accessibilityLabel={chip.label}
          style={styles.chip}
          onPress={() => remove(chip)}
        >
          <View style={[styles.chipDot, { backgroundColor: chip.color }]} />
          <Text style={styles.chipLabel}>{chip.label}</Text>
          <X size={13} color={theme.colors.textTertiary} strokeWidth={2} />
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange({ categoryIds: [], subcategoryIds: [] })}
      >
        <Text style={styles.clearAll}>{strings.filter.clearAll}</Text>
      </Pressable>
    </View>
  );
}

const styles = createStyles((t) => ({
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: t.spacing.space4,
    paddingTop: t.spacing.space2,
    paddingHorizontal: t.spacing.screenGutter,
    paddingBottom: t.spacing.space5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.space3,
    height: 30,
    // Artboard: 10 left of the dot, 8 right of the x.
    paddingLeft: 10,
    paddingRight: t.spacing.space4,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    shadowColor: t.colors.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  chipDot: {
    width: t.dot.sizeList,
    height: t.dot.sizeList,
    borderRadius: t.radius.pill,
  },
  chipLabel: {
    ...t.typography.meta,
    fontWeight: '500',
    color: t.colors.textPrimary,
  },
  clearAll: {
    ...t.typography.meta,
    color: t.colors.textTertiary,
    paddingHorizontal: t.spacing.space2,
  },
}));
