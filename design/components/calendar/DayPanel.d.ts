import * as React from 'react';

export interface DayPanelEntry {
  id?: string;
  title: string;
  color: string;
  icon?: string;
  /** Show a photo indicator. */
  photos?: boolean;
}

/**
 * The selected-day panel beneath the month grid.
 */
export interface DayPanelProps {
  dateLabel: string;
  entries?: DayPanelEntry[];
  onOpenEntry?: (entry: DayPanelEntry) => void;
  onOpenDay?: () => void;
  emptyLabel?: string;
  style?: React.CSSProperties;
}

export declare function DayPanel(props: DayPanelProps): React.JSX.Element;
