// The calendar filter (#13, ratified direction A): one lens shared across
// month, year, the selected-day panel, and the day view. Union semantics —
// a parent category matches all its entries (children ride along), a
// subcategory matches by subcategory. In-memory only: resets on cold launch.

export type CalendarFilter = {
  categoryIds: string[];
  subcategoryIds: string[];
};

export const emptyFilter: CalendarFilter = { categoryIds: [], subcategoryIds: [] };

export function hasFilter(filter: CalendarFilter): boolean {
  return filter.categoryIds.length > 0 || filter.subcategoryIds.length > 0;
}

/** Client-side lens for surfaces that already hold full entries (day). */
export function entryMatchesFilter(
  entry: { categoryId: string; subcategoryId?: string | null },
  filter: CalendarFilter,
): boolean {
  if (!hasFilter(filter)) return true;
  if (filter.categoryIds.includes(entry.categoryId)) return true;
  return entry.subcategoryId != null && filter.subcategoryIds.includes(entry.subcategoryId);
}

/** The API's filter query params; undefined when no lens is active. */
export function filterParams(
  filter: CalendarFilter,
): { categories: string[]; subcategories: string[] } | undefined {
  if (!hasFilter(filter)) return undefined;
  return { categories: filter.categoryIds, subcategories: filter.subcategoryIds };
}
