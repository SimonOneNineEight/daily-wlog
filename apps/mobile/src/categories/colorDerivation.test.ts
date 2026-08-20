import { theme } from '../theme';

import { deriveInk, deriveTint, hexToHsl, hslToHex } from './colorDerivation';

describe('tint/ink companions', () => {
  // The recipe must reproduce the theme palette's stored pairs exactly:
  // custom colors then relate to their companions the same way presets do.
  it.each(Object.entries(theme.categories))('reproduces the %s palette pair', (_name, entry) => {
    expect(deriveTint(entry.base)).toBe(entry.tint);
    expect(deriveInk(entry.base)).toBe(entry.ink);
  });

  it('derives companions for colors outside the palette', () => {
    // Spot-check the math: ink is 70% of each channel, tint is 13% toward white.
    expect(deriveInk('#FF0000')).toBe('#B30000');
    expect(deriveTint('#000000')).toBe('#DEDEDE');
    expect(deriveTint('#FFFFFF')).toBe('#FFFFFF');
  });
});

describe('hex ↔ HSL', () => {
  const samples = [
    ...Object.values(theme.categories).map((entry) => entry.base as string),
    '#000000',
    '#FFFFFF',
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#808080',
    '#123456',
  ];

  it.each(samples)('round-trips %s through HSL', (hex) => {
    expect(hslToHex(hexToHsl(hex))).toBe(hex);
  });

  it('maps primaries to their known HSL coordinates', () => {
    expect(hexToHsl('#FF0000')).toEqual({ h: 0, s: 1, l: 0.5 });
    expect(hexToHsl('#00FF00')).toEqual({ h: 120, s: 1, l: 0.5 });
    expect(hexToHsl('#0000FF')).toEqual({ h: 240, s: 1, l: 0.5 });
    expect(hexToHsl('#FFFFFF')).toEqual({ h: 0, s: 0, l: 1 });
  });
});
