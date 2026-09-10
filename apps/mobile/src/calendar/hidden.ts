import AsyncStorage from '@react-native-async-storage/async-storage';

// The per-User hidden-set (#30, DESIGN.md §9): Apple Calendar visibility,
// not a filter. Nothing is hidden by default, new categories are born
// visible, and hiding is view state that never changes data. A refined
// Entry follows its Subcategory's row (visible even under a hidden
// parent); an unrefined one follows its Category's. Persists across
// launches; ids of since-deleted categories linger harmlessly unmatched.

export type HiddenSet = {
  categoryIds: string[];
  subcategoryIds: string[];
};

export const nothingHidden: HiddenSet = { categoryIds: [], subcategoryIds: [] };

type CategoryLike = { id: string; parentId?: string | null };
type EntryLike = { categoryId: string; subcategoryId?: string | null };

export function hasHidden(hidden: HiddenSet): boolean {
  return hidden.categoryIds.length > 0 || hidden.subcategoryIds.length > 0;
}

/** Client-side visibility for surfaces that hold full entries (day, panel). */
export function entryIsVisible(entry: EntryLike, hidden: HiddenSet): boolean {
  if (entry.subcategoryId != null) {
    return !hidden.subcategoryIds.includes(entry.subcategoryId);
  }
  return !hidden.categoryIds.includes(entry.categoryId);
}

/** The family circle is lit while any member — parent or child — is visible. */
export function familyIsVisible(
  hidden: HiddenSet,
  category: CategoryLike,
  children: CategoryLike[],
): boolean {
  if (!hidden.categoryIds.includes(category.id)) return true;
  return children.some((child) => !hidden.subcategoryIds.includes(child.id));
}

/** The master switch: any member visible hides the family; none shows it. */
export function toggleFamily(
  hidden: HiddenSet,
  category: CategoryLike,
  children: CategoryLike[],
): HiddenSet {
  const childIds = children.map((child) => child.id);
  if (familyIsVisible(hidden, category, children)) {
    return {
      categoryIds: [...new Set([...hidden.categoryIds, category.id])],
      subcategoryIds: [...new Set([...hidden.subcategoryIds, ...childIds])],
    };
  }
  return {
    categoryIds: hidden.categoryIds.filter((id) => id !== category.id),
    subcategoryIds: hidden.subcategoryIds.filter((id) => !childIds.includes(id)),
  };
}

export function toggleSubcategory(hidden: HiddenSet, id: string): HiddenSet {
  return {
    categoryIds: hidden.categoryIds,
    subcategoryIds: hidden.subcategoryIds.includes(id)
      ? hidden.subcategoryIds.filter((x) => x !== id)
      : [...hidden.subcategoryIds, id],
  };
}

/** 全部隱藏: every current category and subcategory into the set. */
export function hideAll(categories: CategoryLike[]): HiddenSet {
  return {
    categoryIds: categories.filter((c) => !c.parentId).map((c) => c.id),
    subcategoryIds: categories.filter((c) => c.parentId).map((c) => c.id),
  };
}

/** True when every current category and subcategory is hidden (and any exist). */
export function allHidden(hidden: HiddenSet, categories: CategoryLike[]): boolean {
  if (categories.length === 0) return false;
  return categories.every((c) =>
    c.parentId ? hidden.subcategoryIds.includes(c.id) : hidden.categoryIds.includes(c.id),
  );
}

/** The API's hidden-set query params; undefined when nothing is hidden. */
export function hiddenParams(
  hidden: HiddenSet,
): { hiddenCategories: string[]; hiddenSubcategories: string[] } | undefined {
  if (!hasHidden(hidden)) return undefined;
  return { hiddenCategories: hidden.categoryIds, hiddenSubcategories: hidden.subcategoryIds };
}

// Versioned like the drafts store: an unreadable or future-versioned store
// reads as nothing hidden instead of crashing the calendar.
const STORAGE_KEY = 'hiddenCategories.v1';

type Store = { v: 1 } & HiddenSet;

export async function loadHidden(): Promise<HiddenSet> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return nothingHidden;
    const parsed = JSON.parse(raw) as Store;
    if (parsed.v !== 1 || !Array.isArray(parsed.categoryIds) || !Array.isArray(parsed.subcategoryIds)) {
      return nothingHidden;
    }
    return { categoryIds: parsed.categoryIds, subcategoryIds: parsed.subcategoryIds };
  } catch {
    return nothingHidden;
  }
}

export async function saveHidden(hidden: HiddenSet): Promise<void> {
  try {
    const store: Store = { v: 1, ...hidden };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage refused the write; visibility still holds for this session.
  }
}
