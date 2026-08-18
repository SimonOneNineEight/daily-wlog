import * as React from 'react';

export interface EntryCardCategory {
  name: string;
  color: string;
  icon?: string;
}

/**
 * Day-view entry card.
 */
export interface EntryCardProps {
  title: string;
  category?: EntryCardCategory;
  subcategory?: string;
  note?: string;
  photos?: { src?: string; alt?: string }[];
  /** Show the reorder grip. */
  draggable?: boolean;
  /** Lifted shadow while being dragged. */
  dragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export declare function EntryCard(props: EntryCardProps): React.JSX.Element;
