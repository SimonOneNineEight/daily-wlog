import * as React from 'react';

/**
 * Inset list row for settings and category management.
 */
export interface ListRowProps {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  chevron?: boolean;
  trailing?: React.ReactNode;
  /** Round the top / bottom corners at the ends of a group. */
  first?: boolean;
  last?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export declare function ListRow(props: ListRowProps): React.JSX.Element;
