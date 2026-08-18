import React from 'react';
import { CategoryIcon } from '../categories/CategoryIcon.jsx';
import { Icon } from '../core/Icon.jsx';

/** The panel beneath the month grid: the selected day's entry titles with category icons. */
export function DayPanel({ dateLabel, entries = [], onOpenEntry, onOpenDay, emptyLabel = '這天沒有紀錄', style, ...rest }) {
  return (
    <section
      style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-panel)', boxShadow: 'var(--shadow-panel)',
        overflow: 'hidden', ...style,
      }}
      {...rest}
    >
      <header
        onClick={onOpenDay}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-5) var(--card-padding) var(--space-4)',
          cursor: onOpenDay ? 'pointer' : 'default',
        }}
      >
        <span style={{ font: 'var(--type-section-header)', letterSpacing: 'var(--track-subhead)', color: 'var(--text-primary)' }}>{dateLabel}</span>
        {onOpenDay ? <Icon name="chevron-right" size={16} color="var(--text-quaternary)" strokeWidth={2} /> : null}
      </header>
      {entries.length === 0 ? (
        <p style={{ margin: 0, padding: '0 var(--card-padding) var(--space-6)', font: 'var(--type-note)', color: 'var(--text-tertiary)' }}>{emptyLabel}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: '0 0 var(--space-2)' }}>
          {entries.map((e, i) => (
            <li key={e.id || i}>
              <button
                type="button"
                onClick={() => onOpenEntry && onOpenEntry(e)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-5)', width: '100%',
                  padding: 'var(--space-4) var(--card-padding)', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <CategoryIcon icon={e.icon} color={e.color} size="small" />
                <span style={{ flex: 1, minWidth: 0, font: 'var(--type-entry-title)', letterSpacing: 'var(--track-body)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                {e.photos ? <Icon name="image" size={15} color="var(--text-quaternary)" /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
