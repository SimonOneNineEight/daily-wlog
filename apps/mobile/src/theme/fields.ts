import type { Theme } from './theme.gen';

/**
 * The sizing every single-line TextInput in the app shares (#42).
 *
 * Two things go wrong when a field is built from a typography token and a
 * fixed height. The token carries a `lineHeight`, which shifts an iOS
 * TextInput off its baseline and clips the CJK glyph; the fixed height
 * top-anchors the placeholder inside it. So a field takes the token's
 * `fontSize` alone and grows from a floor rather than sitting at a ceiling —
 * the 44pt hit target, which is also where the text scales past.
 *
 * First found on the entry form's subcategory field (Simon, 2026-08-19, two
 * rounds); PM round 2 item 14 found it again on the category search. That
 * subcategory field keeps its own smaller sizing rather than using this: it is
 * a pill among pills and has to match their height, not the hit target.
 */
export function singleLineField(t: Theme) {
  return { minHeight: t.spacing.rowHeight } as const;
}
