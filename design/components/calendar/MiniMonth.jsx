import React from 'react';
import { categoryColor } from '../categories/CategoryDot.jsx';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

/** Year-view mini month: a day with entries becomes a solid box in its FIRST entry's color,
    numeral punched out in white. One color per day, never stripes. */
export function MiniMonth({ year, month, firstColors = {}, today, label, onClick, style, ...rest }) {
  const start = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', ...style }}
      {...rest}
    >
      <span style={{ display: 'block', font: 'var(--weight-semibold) var(--size-footnote) / 16px var(--font-display)', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
        {label || MONTHS[month]}
      </span>
      <span style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((d, i) => {
          const color = d ? firstColors[d] : null;
          return (
            <span
              key={i}
              style={{
                height: 'var(--year-box-size)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 'var(--year-box-radius)',
                background: color ? categoryColor(color) : 'transparent',
                boxShadow: !color && d === today ? 'inset 0 0 0 1px var(--text-primary)' : 'none',
                font: 'var(--weight-regular) var(--size-year-numeral) / 1 var(--font-numeric)',
                color: color ? 'var(--white)' : 'var(--text-tertiary)',
              }}
            >
              {d || ''}
            </span>
          );
        })}
      </span>
    </button>
  );
}
