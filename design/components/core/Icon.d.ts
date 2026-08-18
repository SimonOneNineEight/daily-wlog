import * as React from 'react';

/**
 * Inline SVG glyph from the bundled Lucide set.
 */
export interface IconProps {
  /** File name in assets/icons, without extension, e.g. "calendar". */
  name: string;
  /** Pixel box; 15–26 in practice. Default 20. */
  size?: number;
  /** Default 1.75 to match the drawn, consistent-weight family. */
  strokeWidth?: number;
  /** Any CSS color; defaults to currentColor. */
  color?: string;
  title?: string;
  style?: React.CSSProperties;
}

export declare function Icon(props: IconProps): React.JSX.Element;
