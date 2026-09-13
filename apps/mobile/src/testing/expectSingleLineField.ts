import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

/**
 * Asserts the sizing rule from src/theme/fields.ts on a rendered field (#42).
 *
 * This deliberately reads the resolved style rather than driving the screen,
 * which is the one place these suites depart from #45's testing rule. The
 * defect is a clipped CJK glyph, and jest renders no glyphs: the resolved
 * style is as close to the pixel as this repo can get. The device-side case is
 * KB.10 in docs/manual-tests.md, and that is where it is really checked.
 *
 * The 44 stays a literal on purpose. Reading t.spacing.rowHeight here would
 * make the assertion follow the token, so lowering the token below the hit
 * target would keep every one of these green.
 */
export function expectSingleLineField(placeholder: string) {
  const style = StyleSheet.flatten(screen.getByPlaceholderText(placeholder).props.style);
  // No inherited line box, which is what shifts an iOS input off its baseline.
  expect(style.lineHeight).toBeUndefined();
  // A floor, not a ceiling: a fixed height top-anchors the placeholder.
  expect(style.height).toBeUndefined();
  expect(style.minHeight).toBeGreaterThanOrEqual(44);
}
