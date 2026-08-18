import * as React from 'react';

/** A category color: a preset name ('clay'…'cocoa'), or any CSS color for a custom pick. */
export type CategoryColor = string;

export interface CategoryDotProps {
  color: CategoryColor;
  /** compact = 6px (year/mini), default = 7px (month grid), list = 10px. */
  size?: 'compact' | 'default' | 'list';
  style?: React.CSSProperties;
}

export interface CategoryDotsProps {
  /** Category colors in entry order. */
  colors: CategoryColor[];
  size?: 'compact' | 'default' | 'list';
  /** Dots shown before collapsing to "+n". Default 4 — never a fifth dot. */
  max?: number;
  style?: React.CSSProperties;
}

export declare function CategoryDot(props: CategoryDotProps): React.JSX.Element;
export declare function CategoryDots(props: CategoryDotsProps): React.JSX.Element;
export declare function categoryColor(color: CategoryColor): string;
