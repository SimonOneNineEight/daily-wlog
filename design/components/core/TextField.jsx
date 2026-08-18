import React from 'react';

/** Single-line title field or multi-line note field, iOS inset style. */
export function TextField({ value, onChange, placeholder, multiline, rows = 4, label, maxLength, autoFocus, style, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  const shared = {
    width: '100%', border: 'none', outline: 'none', background: 'transparent',
    font: multiline ? 'var(--type-note)' : 'var(--type-entry-title)',
    letterSpacing: 'var(--track-body)', color: 'var(--text-primary)', resize: 'none',
    fontFamily: 'var(--font-text)',
  };
  return (
    <label style={{ display: 'block', ...style }}>
      {label ? (
        <span style={{ display: 'block', font: 'var(--type-meta)', color: 'var(--text-tertiary)', margin: '0 0 var(--space-3) var(--space-2)' }}>{label}</span>
      ) : null}
      <span
        style={{
          display: 'block', background: 'var(--surface)', borderRadius: 'var(--radius-card)',
          padding: multiline ? 'var(--space-5) var(--card-padding)' : '0 var(--card-padding)',
          minHeight: multiline ? undefined : 'var(--hit-min)',
          display: 'flex', alignItems: multiline ? 'stretch' : 'center',
          boxShadow: focused ? 'inset 0 0 0 1px var(--focus-ring)' : 'inset 0 0 0 1px var(--line-separator)',
          transition: 'box-shadow var(--duration-fast) var(--ease-standard)',
        }}
      >
        {multiline ? (
          <textarea
            value={value} onChange={onChange} placeholder={placeholder} rows={rows} maxLength={maxLength} autoFocus={autoFocus}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={shared} {...rest}
          />
        ) : (
          <input
            type="text" value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} autoFocus={autoFocus}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={shared} {...rest}
          />
        )}
      </span>
    </label>
  );
}
