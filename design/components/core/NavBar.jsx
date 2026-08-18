import React from 'react';

/** Screen top bar: large or inline title, leading/trailing action slots, hairline on scroll. */
export function NavBar({ title, subtitle, leading, trailing, large, bordered = true, style, ...rest }) {
  return (
    <header
      style={{
        display: 'flex', alignItems: large ? 'flex-end' : 'center', gap: 'var(--space-4)',
        minHeight: large ? 64 : 'var(--nav-bar-height)',
        padding: large ? '4px var(--screen-gutter) 10px' : '0 var(--space-4) 0 var(--space-4)',
        background: 'var(--material-bar)', backdropFilter: 'var(--blur-bar)', WebkitBackdropFilter: 'var(--blur-bar)',
        boxShadow: bordered ? 'inset 0 -1px 0 var(--line-separator)' : 'none',
        position: 'relative', zIndex: 2, ...style,
      }}
      {...rest}
    >
      {leading ? <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>{leading}</span> : null}
      <span style={{ flex: 1, minWidth: 0, textAlign: large ? 'left' : 'center' }}>
        <span
          style={{
            display: 'block',
            font: large ? 'var(--type-nav-title)' : 'var(--weight-semibold) var(--size-headline) / 22px var(--font-display)',
            letterSpacing: large ? 'var(--track-title-1)' : 'var(--track-body)',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </span>
        {subtitle ? <span style={{ display: 'block', font: 'var(--type-meta)', color: 'var(--text-tertiary)' }}>{subtitle}</span> : null}
      </span>
      {trailing ? <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>{trailing}</span> : null}
    </header>
  );
}
