import * as React from 'react';

/**
 * Photo grid, up to 10 per entry, drag order. Never a carousel.
 */
export interface PhotoGridProps {
  photos?: { src?: string; alt?: string }[];
  columns?: number;
  /** Hard cap; 10 per entry. */
  max?: number;
  /** Show remove buttons and the add tile. */
  editable?: boolean;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  /** Fixed tile size in px instead of fluid columns. */
  size?: number;
  style?: React.CSSProperties;
}

export declare function PhotoGrid(props: PhotoGridProps): React.JSX.Element;
