import { strings } from '../i18n/strings';

/** "8月19日 星期三" for a YYYY-MM-DD date string. */
export function dateHeading(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  const weekday = strings.month.weekdaysFull[new Date(`${date}T00:00:00`).getDay()];
  return strings.month.dateLabel(month, day, weekday);
}
