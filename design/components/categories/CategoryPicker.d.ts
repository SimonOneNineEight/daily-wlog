import * as React from 'react';

export interface PickerCategory {
  id?: string;
  name: string;
  color: string;
  icon?: string;
}

/**
 * Category-first picker with inline "Create …" for an unmatched query.
 */
export interface CategoryPickerProps {
  categories: PickerCategory[];
  value?: PickerCategory | null;
  onChange?: (category: PickerCategory) => void;
  onCreate?: (name: string) => void;
  /** Controlled query text; omit to let the component own it. */
  query?: string;
  onQueryChange?: (q: string) => void;
  style?: React.CSSProperties;
}

export declare function CategoryPicker(props: CategoryPickerProps): React.JSX.Element;
