import * as React from 'react';

/**
 * The product's face: a month grid filling with colored dots.
 */
export interface MonthGridProps {
  year: number;
  /** 0-indexed month. */
  month: number;
  /** Day number → category colors in entry order. */
  entries?: Record<number, string[]>;
  /** Day number that is today, when this month contains it. */
  today?: number;
  selected?: number;
  onSelectDay?: (day: number) => void;
  style?: React.CSSProperties;
}

export declare function MonthGrid(props: MonthGridProps): React.JSX.Element;
