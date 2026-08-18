import { buildWeeks, dayDots, monthKey, shiftMonth } from './monthMath';

describe('buildWeeks', () => {
  it('lays out 2026-08 like Apple Calendar (weeks start on Sunday)', () => {
    const weeks = buildWeeks(2026, 8);
    expect(weeks).toHaveLength(6);
    // August 1st 2026 is a Saturday: six leading outside days from July.
    expect(weeks[0].slice(0, 6).every((cell) => cell.outside)).toBe(true);
    expect(weeks[0][6]).toEqual({ day: 1, outside: false });
    expect(weeks[5][1]).toEqual({ day: 31, outside: false });
    // Trailing cells continue into September.
    expect(weeks[5][2]).toEqual({ day: 1, outside: true });
  });

  it('pads February of a non-leap year correctly', () => {
    const weeks = buildWeeks(2026, 2);
    const days = weeks.flat().filter((cell) => !cell.outside);
    expect(days).toHaveLength(28);
    expect(days[0]).toEqual({ day: 1, outside: false });
  });
});

describe('dayDots', () => {
  it('keeps entry order and collapses overflow past four', () => {
    const { shown, overflow } = dayDots(['a', 'b', 'c', 'd', 'e', 'f'], 4);
    expect(shown).toEqual(['a', 'b', 'c', 'd']);
    expect(overflow).toBe(2);
  });

  it('shows all dots when at or under the cap', () => {
    expect(dayDots(['a', 'b'], 4)).toEqual({ shown: ['a', 'b'], overflow: 0 });
  });
});

describe('month keys', () => {
  it('formats and shifts across year boundaries', () => {
    expect(monthKey(2026, 8)).toBe('2026-08');
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});
