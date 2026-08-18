import * as React from 'react';

/**
 * One day in the month grid.
 */
export interface DayCellProps {
  day: number;
  /** Category colors of that day's entries, in entry order. */
  colors?: string[];
  today?: boolean;
  selected?: boolean;
  /** Leading/trailing day from an adjacent month. */
  outside?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export declare function DayCell(props: DayCellProps): React.JSX.Element;
