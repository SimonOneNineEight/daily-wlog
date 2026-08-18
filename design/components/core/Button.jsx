import React from 'react';
import { Icon } from './Icon.jsx';

const sizes = {
  small: { height: 32, padding: '0 12px', font: 'var(--weight-medium) var(--size-footnote) / 1 var(--font-text)', radius: 'var(--radius-3)', icon: 15 },
  medium: { height: 40, padding: '0 16px', font: 'var(--weight-medium) var(--size-subhead) / 1 var(--font-text)', radius: 'var(--radius-4)', icon: 17 },
  large: { height: 50, padding: '0 20px', font: 'var(--weight-semibold) var(--size-body) / 1 var(--font-text)', radius: 'var(--radius-card)', icon: 19 },
};

const variants = {
  primary: { background: 'var(--control-primary-bg)', color: 'var(--control-primary-fg)', border: '1px solid transparent' },
  secondary: { background: 'var(--control-secondary-bg)', color: 'var(--control-secondary-fg)', border: '1px solid transparent' },
  ghost: { background: 'transparent', color: 'var(--control-ghost-fg)', border: '1px solid transparent' },
  outline: { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--line-separator-strong)' },
  destructive: { background: 'transparent', color: 'var(--text-destructive)', border: '1px solid transparent' },
};

/** Neutral text button. Chrome only — never carries a category color. */
export function Button({ children, variant = 'secondary', size = 'medium', icon, iconTrailing, fullWidth, disabled, onClick, style, ...rest }) {
  const [pressed, setPressed] = React.useState(false);
  const s = sizes[size] || sizes.medium;
  const v = variants[variant] || variants.secondary;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)',
        height: s.height, minWidth: s.height, padding: s.padding, font: s.font, borderRadius: s.radius,
        letterSpacing: 'var(--track-subhead)', width: fullWidth ? '100%' : undefined,
        background: disabled ? 'var(--control-disabled-bg)' : v.background,
        color: disabled ? 'var(--control-disabled-fg)' : v.color,
        border: v.border, cursor: disabled ? 'default' : 'pointer',
        opacity: pressed && !disabled ? 'var(--press-opacity)' : 1,
        transition: 'opacity var(--duration-press) var(--ease-standard), background var(--duration-fast) var(--ease-standard)',
        WebkitTapHighlightColor: 'transparent', ...style,
      }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={s.icon} /> : null}
      {children}
      {iconTrailing ? <Icon name={iconTrailing} size={s.icon} /> : null}
    </button>
  );
}
