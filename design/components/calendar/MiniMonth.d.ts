import * as React from 'react';

/**
 * Year-view mini month with solid single-color day boxes.
 */
export interface MiniMonthProps {
  year: number;
  /** 0-indexed month. */
  month: number;
  /** Day number → the day's FIRST entry's category color. One color per day. */
  firstColors?: Record<number, string>;
  today?: number;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export declare function MiniMonth(props: MiniMonthProps): React.JSX.Element;
