import type { ComponentProps } from 'react';
import { Pressable as RNPressable } from 'react-native';

type Props = ComponentProps<typeof RNPressable> & {
  /**
   * The design's press states (README States): rows and text dim to
   * opacity 0.72, the + scales to 0.97, scrims give no feedback.
   */
  feedback?: 'opacity' | 'scale' | 'none';
};

// Drop-in Pressable that applies the canvas press state by default; screens
// import this instead of react-native's.
export function Pressable({ feedback = 'opacity', style, ...rest }: Props) {
  return (
    <RNPressable
      {...rest}
      style={(state) => {
        const base = typeof style === 'function' ? style(state) : style;
        if (!state.pressed || feedback === 'none') return base;
        if (feedback === 'scale') return [base, { transform: [{ scale: 0.97 }] }];
        return [base, { opacity: 0.72 }];
      }}
    />
  );
}
