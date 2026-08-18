import React from 'react';
import { Icon } from './Icon.jsx';

/** Square-ish icon-only control for nav bars and card affordances. */
export function IconButton({ icon, size = 'medium', variant = 'ghost', label, disabled, onClick, style, ...rest }) {
  const [pressed, setPressed] = React.useState(false);
  const box = size === 'small' ? 32 : size === 'large' ? 44 : 38;
  const glyph = size === 'small' ? 17 : size === 'large' ? 23 : 20;
  const bg = variant === 'filled' ? 'var(--control-secondary-bg)' : 'transparent';
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: box, height: box, borderRadius: variant === 'filled' ? 'var(--radius-pill)' : 'var(--radius-3)',
        background: bg, border: 'none', padding: 0,
        color: disabled ? 'var(--control-disabled-fg)' : 'var(--icon-default)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: pressed && !disabled ? 'var(--press-opacity)' : 1,
        transition: 'opacity var(--duration-press) var(--ease-standard)',
        WebkitTapHighlightColor: 'transparent', ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={glyph} />
    </button>
  );
}
