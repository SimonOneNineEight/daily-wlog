import * as React from 'react';

/**
 * Neutral text button for chrome.
 */
export interface ButtonProps {
  children?: React.ReactNode;
  /** Neutral only — no variant carries a category color. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  /** Icon name from assets/icons. */
  icon?: string;
  iconTrailing?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export declare function Button(props: ButtonProps): React.JSX.Element;
