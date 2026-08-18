import * as React from 'react';

/**
 * The persistent "+" for today; weight from shape, fill and depth only.
 */
export interface AddButtonProps {
  onClick?: (e: React.MouseEvent) => void;
  label?: string;
  /** Absolutely positioned bottom-right when true (default). */
  floating?: boolean;
  style?: React.CSSProperties;
}

export declare function AddButton(props: AddButtonProps): React.JSX.Element;
