import React from 'react';
import { Icon } from './Icon.jsx';

/** Inset list row: leading slot, title (+ optional secondary), trailing value or chevron. */
export function ListRow({ leading, title, subtitle, value, chevron, first, last, onClick, trailing, style, ...rest }) {
  const [pressed, setPressed] = React.useState(false);
  const interactive = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      onPointerDown={() => interactive && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-5)',
        minHeight: 'var(--row-height)', padding: 'var(--row-padding-y) var(--card-padding)',
        background: pressed ? 'var(--surface-fill)' : 'var(--surface)',
        borderTopLeftRadius: first ? 'var(--radius-card)' : 0, borderTopRightRadius: first ? 'var(--radius-card)' : 0,
        borderBottomLeftRadius: last ? 'var(--radius-card)' : 0, borderBottomRightRadius: last ? 'var(--radius-card)' : 0,
        boxShadow: last ? 'none' : 'inset 0 -1px 0 var(--line-separator)',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background var(--duration-press) var(--ease-standard)', ...style,
      }}
      {...rest}
    >
      {leading}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', font: 'var(--type-entry-title)', letterSpacing: 'var(--track-body)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        {subtitle ? (
          <span style={{ display: 'block', font: 'var(--type-meta)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>{subtitle}</span>
        ) : null}
      </span>
      {value ? <span style={{ font: 'var(--type-note)', color: 'var(--text-tertiary)' }}>{value}</span> : null}
      {trailing}
      {chevron ? <Icon name="chevron-right" size={17} color="var(--text-quaternary)" strokeWidth={2} /> : null}
    </div>
  );
}
