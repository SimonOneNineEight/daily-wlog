// Code generated from design/tokens/*.css by scripts/generate-theme.mjs. DO NOT EDIT.
// Regenerate with `pnpm generate:theme`; CI fails when this file drifts from
// the token CSS, which stays the single source of truth.

declare const tokenColorBrand: unique symbol;
/**
 * A color that came from the design tokens. Only theme values carry the
 * brand, so a hardcoded color literal fails to typecheck wherever a
 * TokenColor is required (see createStyles in src/theme).
 */
export type TokenColor = string & { readonly [tokenColorBrand]: true };

const c = (value: string) => value as TokenColor;

export const theme = {
  colors: {
    background: c('#F4F4F5'),
    surface: c('#FFFFFF'),
    surfaceRaised: c('#FFFFFF'),
    surfaceSunken: c('#FAFAFA'),
    surfaceFill: c('#EDEDEF'),
    surfaceFillStrong: c('#E4E4E7'),
    surfaceToday: c('#1C1C1E'),
    scrim: c('rgba(0, 0, 0, 0.28)'),
    materialBar: c('rgba(255, 255, 255, 0.82)'),
    textPrimary: c('#1C1C1E'),
    textSecondary: c('#6B6B70'),
    textTertiary: c('#8E8E93'),
    textQuaternary: c('#B4B4BB'),
    textOnDark: c('#FFFFFF'),
    textPlaceholder: c('#B4B4BB'),
    textDestructive: c('#A33A2E'),
    lineGrid: c('#E4E4E7'),
    lineSeparator: c('#E4E4E7'),
    lineSeparatorStrong: c('#D3D3D8'),
    lineField: c('#D3D3D8'),
    focusRing: c('#1C1C1E'),
    controlPrimaryBg: c('#1C1C1E'),
    controlPrimaryBgPressed: c('#000000'),
    controlPrimaryFg: c('#FFFFFF'),
    controlSecondaryBg: c('#EDEDEF'),
    controlSecondaryBgPressed: c('#E4E4E7'),
    controlSecondaryFg: c('#1C1C1E'),
    controlGhostFg: c('#4A4A4F'),
    controlDisabledBg: c('#F4F4F5'),
    controlDisabledFg: c('#B4B4BB'),
    iconDefault: c('#4A4A4F'),
    iconMuted: c('#8E8E93'),
  },
  categories: {
    clay: { base: c('#D56E5C'), tint: c('#FAECEA'), ink: c('#954D40') },
    orange: { base: c('#D88E4A'), tint: c('#FAF0E7'), ink: c('#976334') },
    ochre: { base: c('#D3AE40'), tint: c('#F9F4E6'), ink: c('#947A2D') },
    green: { base: c('#73B062'), tint: c('#EDF5EB'), ink: c('#517B45') },
    eucalyptus: { base: c('#51AC8E'), tint: c('#E8F4F0'), ink: c('#397863') },
    blue: { base: c('#4A93C4'), tint: c('#E7F1F7'), ink: c('#346789') },
    indigo: { base: c('#6D81D0'), tint: c('#ECEFF9'), ink: c('#4C5A92') },
    violet: { base: c('#A26FBD'), tint: c('#F3ECF6'), ink: c('#714E84') },
    pink: { base: c('#D97E95'), tint: c('#FAEEF1'), ink: c('#985868') },
    brown: { base: c('#A37D5F'), tint: c('#F3EEEA'), ink: c('#725843') },
  },
  dot: {
    size: 7,
    sizeCompact: 6,
    sizeList: 10,
    gap: 0,
    maxPerDay: 4,
  },
  yearBox: {
    size: 11,
    radius: 3,
  },
  spacing: {
    space1: 2,
    space2: 4,
    space3: 6,
    space4: 8,
    space5: 12,
    space6: 16,
    space7: 20,
    space8: 24,
    space9: 32,
    space10: 40,
    screenGutter: 16,
    cardPadding: 14,
    rowPaddingY: 11,
    rowHeight: 44,
    hitMin: 44,
    navBarHeight: 52,
    tabBarHeight: 49,
    gridCellHeight: 52,
    gridCellGap: 0,
    panelGap: 12,
    fabSize: 56,
    fabInset: 24,
    thumbSize: 56,
    photoGridGap: 4,
  },
  radius: {
    r1: 4,
    r2: 6,
    r3: 8,
    r4: 10,
    card: 12,
    panel: 14,
    sheet: 20,
    photo: 8,
    pill: 999,
  },
  border: {
    hairline: 1,
  },
  typography: {
    navTitle: { fontSize: 28, lineHeight: 36, fontWeight: '600', letterSpacing: 0 },
    sectionHeader: { fontSize: 15, lineHeight: 22, fontWeight: '600', letterSpacing: 0 },
    entryTitle: { fontSize: 17, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
    note: { fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0 },
    meta: { fontSize: 13, lineHeight: 19, fontWeight: '400', letterSpacing: 0 },
    weekday: { fontSize: 12, lineHeight: 17, fontWeight: '600', letterSpacing: 0 },
    dayNumeral: { fontSize: 15, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
    dayNumeralStrong: { fontSize: 15, lineHeight: 18, fontWeight: '600', letterSpacing: 0 },
    yearNumeral: { fontSize: 8, lineHeight: 8, fontWeight: '400', letterSpacing: 0 },
    dotOverflow: { fontSize: 11, lineHeight: 11, fontWeight: '500', letterSpacing: 0 },
  },
} as const;

export type Theme = typeof theme;
export type ThemeColorName = keyof Theme['colors'];
export type CategoryName = keyof Theme['categories'];
