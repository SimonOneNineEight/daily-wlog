// Color math for the custom color drawer (#11). Pure module, no RN imports.
//
// Tint/ink companions are derived from the base with the same recipe that
// produced the theme palette's stored pairs (verified against all ten in
// colorDerivation.test.ts): tint mixes the base 13% into white, ink scales
// the base to 70%. Custom colors therefore get companions that sit in the
// same relationship to their base as the presets do to theirs.

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  const channel = (v: number) =>
    Math.round(v)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** The pale row/背景 companion: the base mixed 13% into white. */
export function deriveTint(base: string): string {
  const { r, g, b } = parseHex(base);
  const lighten = (v: number) => 0.13 * v + 0.87 * 255;
  return toHex({ r: lighten(r), g: lighten(g), b: lighten(b) });
}

/** The readable-text companion: the base darkened to 70%. */
export function deriveInk(base: string): string {
  const { r, g, b } = parseHex(base);
  return toHex({ r: 0.7 * r, g: 0.7 * g, b: 0.7 * b });
}

export type Hsl = { h: number; s: number; l: number };

/** #RRGGBB → h in [0,360), s and l in [0,1]. */
export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = parseHex(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) {
    return { h: 0, s: 0, l };
  }
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h: number;
  if (max === rn) {
    h = ((gn - bn) / delta) % 6;
  } else if (max === gn) {
    h = (bn - rn) / delta + 2;
  } else {
    h = (rn - gn) / delta + 4;
  }
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/** h in [0,360), s and l in [0,1] → #RRGGBB. */
export function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (h < 60) [rn, gn, bn] = [c, x, 0];
  else if (h < 120) [rn, gn, bn] = [x, c, 0];
  else if (h < 180) [rn, gn, bn] = [0, c, x];
  else if (h < 240) [rn, gn, bn] = [0, x, c];
  else if (h < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];
  return toHex({ r: (rn + m) * 255, g: (gn + m) * 255, b: (bn + m) * 255 });
}
