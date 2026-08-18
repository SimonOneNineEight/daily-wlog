import React from 'react';

export function categoryColor(color) {
  if (!color) return 'var(--grey-400)';
  if (color.startsWith('#') || color.startsWith('var(') || color.startsWith('rgb') || color.startsWith('oklch')) return color;
  return 'var(--cat-' + color + ')';
}

/** One category dot. Sizes: compact (6px, year/mini), default (7px, month grid), list (10px). */
export function CategoryDot({ color, size = 'default', style, ...rest }) {
  const px = size === 'compact' ? 'var(--dot-size-compact)' : size === 'list' ? 'var(--dot-size-list)' : 'var(--dot-size)';
  return (
    <span
      style={{ width: px, height: px, borderRadius: 'var(--radius-pill)', background: categoryColor(color), display: 'inline-block', flex: '0 0 auto', ...style }}
      {...rest}
    />
  );
}

/** Up to 4 dots in entry order; a 5th and beyond collapse into "+n" — never a fifth dot. */
export function CategoryDots({ colors = [], size = 'default', max = 4, style, ...rest }) {
  const shown = colors.slice(0, max);
  const overflow = colors.length - shown.length;
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--dot-gap)', ...style }} {...rest}>
      {shown.map((c, i) => <CategoryDot key={i} color={c} size={size} />)}
      {overflow > 0 ? (
        <span style={{ font: 'var(--weight-medium) var(--size-caption-2) / 1 var(--font-numeric)', color: 'var(--text-tertiary)', marginLeft: 'var(--space-1)' }}>
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}
