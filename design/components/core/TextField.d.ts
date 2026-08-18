import * as React from 'react';

/**
 * Inset title or note field.
 */
export interface TextFieldProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  /** Renders a textarea for note content. */
  multiline?: boolean;
  rows?: number;
  label?: string;
  maxLength?: number;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}

export declare function TextField(props: TextFieldProps): React.JSX.Element;
