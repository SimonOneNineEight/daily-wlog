import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { CategoryIcon } from './CategoryIcon.jsx';

/** Category picker: filterable list, single select, inline "Create …" when the query has no match. */
export function CategoryPicker({ categories = [], value, onChange, onCreate, query, onQueryChange, style, ...rest }) {
  const [internal, setInternal] = React.useState('');
  const q = query !== undefined ? query : internal;
  const setQ = onQueryChange || setInternal;
  const filtered = categories.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const exact = categories.some((c) => c.name.toLowerCase() === q.trim().toLowerCase());
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', ...style }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', height: 38, padding: '0 var(--space-5)', background: 'var(--surface-fill)', borderRadius: 'var(--radius-4)' }}>
        <Icon name="search" size={16} color="var(--icon-muted)" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="類別"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', font: 'var(--type-note)', fontFamily: 'var(--font-text)', color: 'var(--text-primary)' }}
        />
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
        {filtered.map((c, i) => (
          <button
            key={c.id || c.name}
            type="button"
            onClick={() => onChange && onChange(c)}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-5)', width: '100%',
              padding: 'var(--row-padding-y) var(--card-padding)', minHeight: 'var(--row-height)',
              background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
              boxShadow: i === filtered.length - 1 && exact ? 'none' : 'inset 0 -1px 0 var(--line-separator)',
            }}
          >
            <CategoryIcon icon={c.icon} color={c.color} size="small" />
            <span style={{ flex: 1, font: 'var(--type-entry-title)', letterSpacing: 'var(--track-body)', color: 'var(--text-primary)' }}>{c.name}</span>
            {value && (value.id || value.name) === (c.id || c.name) ? <Icon name="check" size={18} color="var(--text-primary)" strokeWidth={2} /> : null}
          </button>
        ))}
        {q.trim() && !exact ? (
          <button
            type="button"
            onClick={() => onCreate && onCreate(q.trim())}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-5)', width: '100%',
              padding: 'var(--row-padding-y) var(--card-padding)', minHeight: 'var(--row-height)',
              background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ width: 22, height: 22, borderRadius: 'var(--radius-2)', background: 'var(--surface-fill)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={13} color="var(--icon-default)" strokeWidth={2} />
            </span>
            <span style={{ font: 'var(--type-entry-title)', letterSpacing: 'var(--track-body)', color: 'var(--text-primary)' }}>建立「{q.trim()}」</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
