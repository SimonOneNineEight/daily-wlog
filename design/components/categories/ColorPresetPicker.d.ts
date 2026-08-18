import * as React from 'react';

export interface ColorPresetPickerProps {
  /** Preset name, or 'custom' when the custom swatch is active. */
  value?: string;
  onChange?: (preset: string) => void;
  /** Current custom color, shown in the last swatch. */
  custom?: string;
  onCustom?: () => void;
  style?: React.CSSProperties;
}

export declare const PRESET_COLORS: string[];
export declare function ColorPresetPicker(props: ColorPresetPickerProps): React.JSX.Element;
