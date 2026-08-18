import * as React from 'react';

/**
 * A category's glyph on a solid square in its own color, white glyph.
 */
export interface CategoryIconProps {
  /** Icon name from assets/icons. Never an emoji. */
  icon?: string;
  color: string;
  size?: 'small' | 'medium' | 'large';
  /** Solid category fill with a white glyph. Default true; false gives the
   *  softer glyph-on-tint treatment for dense lists. */
  filled?: boolean;
  style?: React.CSSProperties;
}

export declare function CategoryIcon(props: CategoryIconProps): React.JSX.Element;
