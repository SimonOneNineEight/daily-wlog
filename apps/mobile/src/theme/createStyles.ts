import { StyleSheet } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { theme } from './theme.gen';
import type { Theme, TokenColor } from './theme.gen';

/**
 * Every React Native style property that takes a color: `color` itself plus
 * the `*Color` family (backgroundColor, borderColor, shadowColor, …). The
 * pattern keeps the net over color props RN adds in future versions.
 */
type ColorProp = 'color' | `${string}Color`;

/** The style shape with every color property narrowed to design tokens. */
type Tokenized<S> = { [K in keyof S]: K extends ColorProp ? TokenColor : S[K] };
export type TokenStyle = Tokenized<ViewStyle> | Tokenized<TextStyle> | Tokenized<ImageStyle>;

/**
 * StyleSheet.create with the theme injected and color properties constrained
 * to TokenColor, so a hardcoded color literal is a type error, not a lint
 * finding. ESLint (react-native/no-color-literals) backstops the escape
 * hatches this can't see, like inline style props.
 */
export function createStyles<T extends Record<string, TokenStyle>>(factory: (t: Theme) => T): T {
  const styles = factory(theme) as unknown as { [K in keyof T]: ViewStyle | TextStyle | ImageStyle };
  return StyleSheet.create(styles) as T;
}
