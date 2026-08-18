import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { categoryColor } from './CategoryDot.jsx';

/** A category's drawn glyph on a solid square in its own color, white glyph — the same value
    as the day's dot. Pass filled={false} for the softer glyph-on-tint treatment. */
export function CategoryIcon({ icon = 'tag', color, size = 'medium', filled = true, style, ...rest }) {
  const box = size === 'small' ? 22 : size === 'large' ? 36 : 28;
  const glyph = size === 'small' ? 13 : size === 'large' ? 20 : 16;
  const c = categoryColor(color);
  const tint = color && !color.startsWith('#') && !color.startsWith('var(') ? 'var(--cat-' + color + '-tint)' : 'var(--grey-150)';
  return (
    <span
      style={{
        width: box, height: box, borderRadius: size === 'small' ? 'var(--radius-2)' : 'var(--radius-3)',
        background: filled ? c : tint, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={glyph} color={filled ? 'var(--white)' : c} strokeWidth={1.75} />
    </span>
  );
}
