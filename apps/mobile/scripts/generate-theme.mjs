// Generates src/theme/theme.gen.ts from design/tokens/*.css, which stays the
// single source of truth for the design system (ratified in
// docs/research/react-native-styling.md). Run via `pnpm generate:theme`.
//
// Parsing scope: `:root` blocks only — reference-only blocks like
// [data-theme="dark-reference"] are ignored. elevation.css and motion.css are
// not consumed yet; extend `build()` when a ticket needs those tokens.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const tokensDir = join(scriptDir, '..', '..', '..', 'design', 'tokens');
const outFile = join(scriptDir, '..', 'src', 'theme', 'theme.gen.ts');

/** Parse every `--name: value;` declared in a file's `:root` blocks, in order. */
function parseRootDeclarations(cssPath) {
  const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = new Map();
  for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (block[1].trim() !== ':root') continue;
    for (const decl of block[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      declarations.set(decl[1], decl[2].trim());
    }
  }
  return declarations;
}

/** Replace var(--x) references using the given scope until none remain. */
function resolve(value, scope) {
  let out = value;
  for (let depth = 0; depth < 10 && out.includes('var('); depth++) {
    out = out.replace(/var\(--([\w-]+)\)/g, (match, name) => {
      const target = scope.get(name);
      if (target === undefined) throw new Error(`unresolvable var(--${name}) in "${value}"`);
      return target;
    });
  }
  if (out.includes('var(')) throw new Error(`var() cycle while resolving "${value}"`);
  return out.replace(/\s+/g, ' ').trim();
}

function camel(kebab) {
  return kebab.replace(/-([a-z0-9])/g, (m, ch) => ch.toUpperCase());
}

/** "7px" -> 7, "999" -> 999 */
function px(value) {
  const m = value.match(/^(-?[\d.]+)(px)?$/);
  if (!m) throw new Error(`expected a px or number token, got "${value}"`);
  return Number(m[1]);
}

function build() {
  const colorsDecl = parseRootDeclarations(join(tokensDir, 'colors.css'));
  const categoriesDecl = parseRootDeclarations(join(tokensDir, 'categories.css'));
  const spacingDecl = parseRootDeclarations(join(tokensDir, 'spacing.css'));
  const radiusDecl = parseRootDeclarations(join(tokensDir, 'radius.css'));
  const typographyDecl = parseRootDeclarations(join(tokensDir, 'typography.css'));

  // Raw palette values (white, black, grey-*) resolve semantic tokens but are
  // never exported: components may only use semantic names.
  const colors = {};
  for (const [name, value] of colorsDecl) {
    if (name === 'white' || name === 'black' || name.startsWith('grey-')) continue;
    colors[camel(name)] = resolve(value, colorsDecl);
  }

  const categories = {};
  const dot = {};
  const yearBox = {};
  for (const [name, value] of categoriesDecl) {
    const cat = name.match(/^cat-([a-z]+)(?:-(tint|ink))?$/);
    if (cat) {
      const entry = (categories[cat[1]] ??= {});
      entry[cat[2] ?? 'base'] = resolve(value, categoriesDecl);
    } else if (name.startsWith('dot-')) {
      dot[camel(name.slice('dot-'.length))] = px(value);
    } else if (name.startsWith('year-box-')) {
      yearBox[camel(name.slice('year-box-'.length))] = px(value);
    }
  }

  for (const [name, entry] of Object.entries(categories)) {
    for (const part of ['base', 'tint', 'ink']) {
      if (entry[part] === undefined) throw new Error(`category "${name}" is missing its ${part} value`);
    }
  }

  const spacing = {};
  for (const [name, value] of spacingDecl) {
    spacing[camel(name)] = px(value);
  }

  const radius = {};
  const border = {};
  for (const [name, value] of radiusDecl) {
    if (name.startsWith('radius-')) {
      const suffix = name.slice('radius-'.length);
      radius[/^\d+$/.test(suffix) ? `r${suffix}` : camel(suffix)] = px(value);
    } else if (name.startsWith('border-')) {
      border[camel(name.slice('border-'.length))] = px(value);
    }
  }

  // RN has no `font` shorthand: each --type-* role decomposes into an object.
  // fontFamily is omitted on purpose — RN's default is the platform system
  // face, exactly what --font-system resolves to. letterSpacing is pinned to
  // 0 for every role: Han characters take no optical tracking (typography.css).
  const typography = {};
  for (const [name, value] of typographyDecl) {
    if (!name.startsWith('type-')) continue;
    const resolved = resolve(value, typographyDecl);
    const m = resolved.match(/^(\d{3})\s+([\d.]+)px\s*\/\s*([\d.]+)px\s/);
    if (!m) throw new Error(`cannot decompose type role --${name}: "${resolved}"`);
    typography[camel(name.slice('type-'.length))] = {
      fontSize: Number(m[2]),
      lineHeight: Number(m[3]),
      fontWeight: m[1],
      letterSpacing: 0,
    };
  }

  return { colors, categories, dot, yearBox, spacing, radius, border, typography };
}

function emit(theme) {
  const colorLines = Object.entries(theme.colors)
    .map(([k, v]) => `    ${k}: c('${v}'),`)
    .join('\n');
  const categoryLines = Object.entries(theme.categories)
    .map(([k, v]) => `    ${k}: { base: c('${v.base}'), tint: c('${v.tint}'), ink: c('${v.ink}') },`)
    .join('\n');
  const numbers = (obj, indent = '    ') =>
    Object.entries(obj)
      .map(([k, v]) => `${indent}${k}: ${v},`)
      .join('\n');
  const typographyLines = Object.entries(theme.typography)
    .map(
      ([k, v]) =>
        `    ${k}: { fontSize: ${v.fontSize}, lineHeight: ${v.lineHeight}, fontWeight: '${v.fontWeight}', letterSpacing: ${v.letterSpacing} },`,
    )
    .join('\n');

  return `// Code generated from design/tokens/*.css by scripts/generate-theme.mjs. DO NOT EDIT.
// Regenerate with \`pnpm generate:theme\`; CI fails when this file drifts from
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
${colorLines}
  },
  categories: {
${categoryLines}
  },
  dot: {
${numbers(theme.dot)}
  },
  yearBox: {
${numbers(theme.yearBox)}
  },
  spacing: {
${numbers(theme.spacing)}
  },
  radius: {
${numbers(theme.radius)}
  },
  border: {
${numbers(theme.border)}
  },
  typography: {
${typographyLines}
  },
} as const;

export type Theme = typeof theme;
export type ThemeColorName = keyof Theme['colors'];
export type CategoryName = keyof Theme['categories'];
`;
}

writeFileSync(outFile, emit(build()));
console.log(`wrote ${outFile}`);
