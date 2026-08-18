import * as React from 'react';

/**
 * Screen top bar with translucent material and hairline.
 */
export interface NavBarProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Large left-aligned title (month name, screen landing). */
  large?: boolean;
  bordered?: boolean;
  style?: React.CSSProperties;
}

export declare function NavBar(props: NavBarProps): React.JSX.Element;
