import * as React from 'react';

/**
 * Icon-only control for nav bars and card affordances.
 */
export interface IconButtonProps {
  icon: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'ghost' | 'filled';
  /** Accessible label; required since there is no visible text. */
  label?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export declare function IconButton(props: IconButtonProps): React.JSX.Element;
