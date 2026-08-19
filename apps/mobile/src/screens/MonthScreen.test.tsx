import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { encodeContent } from '../entries/content';
import { MonthScreen } from './MonthScreen';

// The month screen is pinned to a fixed "today" so assertions are stable.
const TODAY = new Date(2026, 7, 17); // 2026-08-17, a Monday

const categories = [
  { id: 'c-work', name: '工作', color: '#4A93C4', icon: 'briefcase', position: 1 },
  { id: 'c-sport', name: '運動', color: '#73B062', icon: 'dumbbell', position: 2 },
];

const realFetch = globalThis.fetch;
let monthDays: object[] = [];
let dayEntries: Record<string, object[]> = {};

beforeEach(() => {
  monthDays = [];
  dayEntries = {};
  globalThis.fetch = jest.fn(async (url: unknown) => {
    const u = String(url);
    if (u.includes('/months/')) {
      return { ok: true, json: async () => ({ days: monthDays }) };
    }
    if (u.includes('/entries?date=')) {
      const date = u.split('date=')[1];
      return { ok: true, json: async () => ({ entries: dayEntries[date] ?? [] }) };
    }
    throw new Error(`unexpected fetch ${u}`);
  }) as jest.Mock;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function renderMonth(overrides: Partial<React.ComponentProps<typeof MonthScreen>> = {}) {
  return render(
    <MonthScreen
      accessToken="tok"
      categories={categories}
      today={TODAY}
      onOpenDay={jest.fn()}
      onAddEntry={jest.fn()}
      {...overrides}
    />,
  );
}

it('renders the month title and the weekday header', async () => {
  renderMonth();
  expect(await screen.findByText('8月')).toBeTruthy();
  expect(screen.getByText('2026年')).toBeTruthy();
  const page = within(screen.getByTestId('month-page-current'));
  for (const weekday of ['日', '一', '二', '三', '四', '五', '六']) {
    expect(page.getByText(weekday)).toBeTruthy();
  }
});

it('collapses a day with more than four entries into a plain +', async () => {
  monthDays = [
    {
      date: '2026-08-12',
      categoryIds: ['c-work', 'c-sport', 'c-work', 'c-sport', 'c-work', 'c-sport'],
    },
  ];
  renderMonth();
  expect(await screen.findByText('+')).toBeTruthy();
});

it("shows today's entries in the panel by default and the empty line otherwise", async () => {
  dayEntries['2026-08-17'] = [
    {
      id: 'e1',
      date: '2026-08-17',
      position: 1,
      categoryId: 'c-sport',
      authorId: 'u1',
      content: encodeContent({ title: '晨跑', note: '' }),
    },
  ];
  renderMonth();
  expect(await screen.findByText('晨跑')).toBeTruthy();
  expect(screen.getByText('8月17日 星期一')).toBeTruthy();

  await act(async () => {
    fireEvent.press(within(screen.getByTestId('month-page-current')).getByText('20'));
  });
  expect(await screen.findByText('這天沒有紀錄')).toBeTruthy();
  expect(screen.getByText('8月20日 星期四')).toBeTruthy();
});

it('moves between months with the chevrons and fetches the new month', async () => {
  renderMonth();
  await screen.findByText('8月');

  await act(async () => {
    fireEvent.press(screen.getByLabelText('下一個月'));
  });
  expect(await screen.findByText('9月')).toBeTruthy();
  const monthCalls = (globalThis.fetch as jest.Mock).mock.calls
    .map(([url]) => String(url))
    .filter((u) => u.includes('/months/'));
  expect(monthCalls.some((u) => u.includes('/months/2026-09'))).toBe(true);

  await act(async () => {
    fireEvent.press(screen.getByLabelText('上一個月'));
    fireEvent.press(screen.getByLabelText('上一個月'));
  });
  expect(await screen.findByText('7月')).toBeTruthy();
});

it('opens the day view when the already-selected day is tapped again', async () => {
  const onOpenDay = jest.fn();
  renderMonth({ onOpenDay });
  await screen.findByText('8月');

  // Today (the 17th) starts selected; tapping it again opens the day view.
  await act(async () => {
    fireEvent.press(within(screen.getByTestId('month-page-current')).getByText('17'));
  });
  expect(onOpenDay).toHaveBeenCalledWith('2026-08-17');
});

it('settles a swipe onto the neighboring month', async () => {
  renderMonth();
  await screen.findByText('8月');

  const { width } = Dimensions.get('window');
  await act(async () => {
    fireEvent(screen.getByTestId('month-pager'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 2 * width } },
    });
  });
  expect(await screen.findByText('9月')).toBeTruthy();
});

it('opens the day view from the panel and the form from the +', async () => {
  const onOpenDay = jest.fn();
  const onAddEntry = jest.fn();
  renderMonth({ onOpenDay, onAddEntry });
  await screen.findByText('8月');

  await act(async () => {
    fireEvent.press(screen.getByText('8月17日 星期一'));
  });
  expect(onOpenDay).toHaveBeenCalledWith('2026-08-17');

  fireEvent.press(screen.getByLabelText('新增紀錄'));
  expect(onAddEntry).toHaveBeenCalled();
});
