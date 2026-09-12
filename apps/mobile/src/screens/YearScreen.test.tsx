import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { cat } from '../testing/fixtures';
import { installMockApi, type MockApi } from '../testing/mockApi';
import { YearScreen } from './YearScreen';

const categories = [cat.work, { ...cat.sport, position: 2 }];

let api: MockApi;

beforeEach(() => {
  api = installMockApi({
    years: {
      '2026': {
        days: [
          { date: '2026-03-15', categoryId: 'c-sport' },
          { date: '2026-08-02', categoryId: 'c-work' },
        ],
        totalEntries: 3,
      },
      '2025': {
        days: [{ date: '2025-06-09', categoryId: 'c-work' }],
        totalEntries: 1,
      },
    },
  });
});

afterEach(() => {
  api.restore();
});

function renderScreen(overrides: Partial<React.ComponentProps<typeof YearScreen>> = {}) {
  return render(
    <YearScreen
      accessToken="tok"
      categories={categories}
      today={new Date(2026, 7, 5)}
      onOpenMonth={jest.fn()}
      onChangeHidden={jest.fn()}
      {...overrides}
    />,
  );
}

it('renders twelve mini months with first-entry colors and the year count', async () => {
  renderScreen();

  for (let month = 1; month <= 12; month++) {
    expect(screen.getByLabelText(`${month}月`)).toBeTruthy();
  }
  await waitFor(() => expect(screen.getByTestId('year-day-3-15')).toBeTruthy());
  expect(screen.getByTestId('year-day-3-15')).toHaveStyle({ backgroundColor: '#73B062' });
  expect(screen.getByTestId('year-day-8-2')).toHaveStyle({ backgroundColor: '#4A93C4' });
  expect(screen.getByText('今年到目前為止 3 則紀錄')).toBeTruthy();
});

it('opens the tapped month', async () => {
  const onOpenMonth = jest.fn();
  renderScreen({ onOpenMonth });

  await waitFor(() => expect(screen.getByTestId('year-day-3-15')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('3月'));
  expect(onOpenMonth).toHaveBeenCalledWith(2026, 3);
});

it('shows a past year with the totals phrasing after paging back', async () => {
  renderScreen();

  await waitFor(() => expect(screen.getByTestId('year-day-3-15')).toBeTruthy());
  act(() => {
    fireGestureHandler(getByGestureTestId('year-fling-prev'), [
      { state: State.BEGAN },
      { state: State.ACTIVE },
      { state: State.END },
    ]);
  });

  expect(screen.getByText('2025年')).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId('year-day-6-9')).toBeTruthy());
  // Past years drop the "so far this year" phrasing.
  expect(screen.getByText('共 1 則紀錄')).toBeTruthy();
});

it('holds no back button and no year chevrons (#27)', async () => {
  renderScreen();
  await waitFor(() => expect(screen.getByTestId('year-day-3-15')).toBeTruthy());

  expect(screen.queryByLabelText('返回')).toBeNull();
  expect(screen.queryByLabelText('上一年')).toBeNull();
  expect(screen.queryByLabelText('下一年')).toBeNull();
  expect(screen.getByLabelText('今天')).toBeTruthy();
  expect(screen.getByLabelText('類別')).toBeTruthy();
});

it('opens the endless year wheel from the title and picks a year (#27)', async () => {
  renderScreen();
  await waitFor(() => expect(screen.getByTestId('year-day-3-15')).toBeTruthy());

  fireEvent.press(screen.getByLabelText('選擇年份'));
  // Future years are allowed: 2028 sits in the wheel's centered window.
  await act(async () => {
    fireEvent.press(within(screen.getByTestId('year-wheel')).getByText('2028年'));
  });

  expect(screen.getByText('2028年')).toBeTruthy();
  expect(screen.queryByTestId('year-wheel')).toBeNull();
  const calls = (globalThis.fetch as jest.Mock).mock.calls.map(([u]) => String(u));
  expect(calls.some((u) => u.includes('/years/2028'))).toBe(true);
});

it('swipes to the neighboring years (#26)', async () => {
  renderScreen();
  await waitFor(() => expect(screen.getByTestId('year-day-3-15')).toBeTruthy());

  act(() => {
    fireGestureHandler(getByGestureTestId('year-fling-prev'), [
      { state: State.BEGAN },
      { state: State.ACTIVE },
      { state: State.END },
    ]);
  });
  expect(screen.getByText('2025年')).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId('year-day-6-9')).toBeTruthy());

  act(() => {
    fireGestureHandler(getByGestureTestId('year-fling-next'), [
      { state: State.BEGAN },
      { state: State.ACTIVE },
      { state: State.END },
    ]);
  });
  expect(screen.getByText('2026年')).toBeTruthy();
});

it('sends the hidden-set to the year endpoint (#30)', async () => {
  renderScreen({
    hidden: { categoryIds: ['c-work'], subcategoryIds: [] },
  });
  await waitFor(() => {
    const calls = (globalThis.fetch as jest.Mock).mock.calls.map(([u]) => String(u));
    expect(calls.some((u) => u.includes('/years/2026?hiddenCategories=c-work'))).toBe(true);
  });
});

it('opens on the year it was handed, not the current one (#40 item 10)', async () => {
  renderScreen({ initialYear: 2022 });
  expect(await screen.findByText('2022年')).toBeTruthy();
});

it('returns the year view to this year without leaving it (#40 item 11)', async () => {
  const onOpenMonth = jest.fn();
  renderScreen({ initialYear: 2022, onOpenMonth });
  expect(await screen.findByText('2022年')).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByLabelText('今天'));
  });
  expect(await screen.findByText('2026年')).toBeTruthy();
  expect(onOpenMonth).not.toHaveBeenCalled();
});
