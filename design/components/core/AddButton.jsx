import React from 'react';
import { Icon } from './Icon.jsx';

/** The persistent "+" for today. Weight comes from shape, fill and depth — never hue. */
export function AddButton({ onClick, label = '新增紀錄', floating = true, style, ...rest }) {
  const [pressed, setPressed] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        position: floating ? 'absolute' : 'relative',
        right: floating ? 'var(--fab-inset)' : undefined,
        bottom: floating ? 'var(--fab-inset)' : undefined,
        width: 'var(--fab-size)', height: 'var(--fab-size)', borderRadius: 'var(--radius-pill)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--control-primary-bg)', color: 'var(--control-primary-fg)',
        border: 'none', boxShadow: 'var(--shadow-fab)', cursor: 'pointer',
        transform: pressed ? 'scale(var(--press-scale))' : 'scale(1)',
        transition: 'transform var(--duration-press) var(--ease-standard)',
        WebkitTapHighlightColor: 'transparent', ...style,
      }}
      {...rest}
    >
      <Icon name="plus" size={26} strokeWidth={2} />
    </button>
  );
}
