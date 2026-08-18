import React from 'react';
import { DayCell } from './DayCell.jsx';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function buildWeeks(year, month) {
  const first = new Date(year, month, 1);
  const start = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = start - 1; i >= 0; i--) cells.push({ day: prevDays - i, outside: true });
  for (let d = 1; d <= days; d++) cells.push({ day: d, outside: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - days - start + 1, outside: true });
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Apple Calendar-style month grid. entries maps day number → array of category colors. */
export function MonthGrid({ year, month, entries = {}, today, selected, onSelectDay, weekdays = WEEKDAYS, style, ...rest }) {
  const weeks = buildWeeks(year, month);
  return (
    <div style={{ background: 'var(--surface)', ...style }} {...rest}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: 'var(--space-3) 0 var(--space-4)' }}>
        {weekdays.map((d, i) => (
          <span key={i} style={{ textAlign: 'center', font: 'var(--type-weekday)', color: 'var(--text-tertiary)' }}>{d}</span>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', boxShadow: 'inset 0 1px 0 var(--line-grid)' }}>
          {week.map((cell, ci) => (
            <DayCell
              key={ci}
              day={cell.day}
              outside={cell.outside}
              colors={cell.outside ? [] : entries[cell.day] || []}
              today={!cell.outside && cell.day === today}
              selected={!cell.outside && cell.day === selected}
              onClick={() => !cell.outside && onSelectDay && onSelectDay(cell.day)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
