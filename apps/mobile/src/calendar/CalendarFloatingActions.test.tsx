import { render, screen } from '@testing-library/react-native';

import { theme } from '../theme';

import { CalendarFloatingActions } from './CalendarFloatingActions';

it('gives both controls the same height, so their edges line up', () => {
  render(<CalendarFloatingActions visible onToday={jest.fn()} onAdd={jest.fn()} />);

  // 56 made a text pill far too heavy beside the circle (Simon, 2026-09-12).
  expect(screen.getByLabelText('今天')).toHaveStyle({ height: theme.spacing.hitMin });
  expect(screen.getByLabelText('新增紀錄')).toHaveStyle({ height: theme.spacing.hitMin });
});

it('sits one screen gutter in from every edge', () => {
  render(<CalendarFloatingActions visible onToday={jest.fn()} onAdd={jest.fn()} />);

  // The same gutter the titles and cards use, so the controls line up with
  // them rather than sitting a step further in.
  expect(screen.getByTestId('calendar-floating-actions')).toHaveStyle({
    left: theme.spacing.screenGutter,
    right: theme.spacing.screenGutter,
    bottom: theme.spacing.screenGutter,
  });
});

it('drops the + where a surface has no unambiguous day to create into', () => {
  render(<CalendarFloatingActions visible onToday={jest.fn()} />);

  expect(screen.getByLabelText('今天')).toBeTruthy();
  expect(screen.queryByLabelText('新增紀錄')).toBeNull();
});

it('stops taking taps while hidden', () => {
  render(<CalendarFloatingActions visible={false} onToday={jest.fn()} onAdd={jest.fn()} />);

  // Faded is not merely invisible: a control you cannot see must not be a
  // target for the content scrolling underneath it.
  expect(screen.getByTestId('calendar-floating-actions')).toHaveProp('pointerEvents', 'none');
});
