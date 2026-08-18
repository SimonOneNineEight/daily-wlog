import React from 'react';
import { CategoryDots } from '../categories/CategoryDot.jsx';

/** One day in the month grid: numeral, today/selected marker, up to four dots. */
export function DayCell({ day, colors = [], today, selected, outside, onClick, style, ...rest }) {
  const marked = today || selected;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)',
        height: 'var(--grid-cell-height)', padding: 'var(--space-3) 0 0', border: 'none', background: 'transparent',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent', ...style,
      }}
      {...rest}
    >
      <span
        style={{
          width: 26, height: 26, borderRadius: 'var(--radius-pill)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          font: marked ? 'var(--type-day-numeral-strong)' : 'var(--type-day-numeral)',
          color: today ? 'var(--text-on-dark)' : outside ? 'var(--text-quaternary)' : 'var(--text-primary)',
          background: today ? 'var(--surface-today)' : 'transparent',
          boxShadow: selected && !today ? 'inset 0 0 0 1.5px var(--text-primary)' : 'none',
        }}
      >
        {day}
      </span>
      <CategoryDots colors={colors} style={{ minHeight: 'var(--dot-size)' }} />
    </button>
  );
}
